import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

const router = Router();

const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:4001';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:4003';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'dev-internal-key-change-me';
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me-in-production';
// JWT_REFRESH_SECRET reserved for signed refresh tokens in future
void process.env.JWT_REFRESH_SECRET;
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';

// ── Helpers ─────────────────────────────────────────────────────

async function notifyRequest(path: string, body: object): Promise<void> {
  try {
    await fetch(`${NOTIFICATION_SERVICE_URL}/notifications${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': INTERNAL_API_KEY },
      body: JSON.stringify(body),
    });
  } catch {
    // Non-blocking: notification failure must not break auth
  }
}

async function dbRequest(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${DB_SERVICE_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-internal-key': INTERNAL_API_KEY,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error((body as any).error || `db-service error: ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  return res.json();
}

function generateTokens(userId: string, email: string, role: string) {
  const accessToken = jwt.sign({ sub: userId, email, role }, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN as any,
  });
  const refreshToken = crypto.randomUUID();
  return { accessToken, refreshToken };
}

function getRefreshExpiry(): Date {
  const match = JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([dhms])$/);
  const value = match ? parseInt(match[1]) : 7;
  const unit = match ? match[2] : 'd';
  const ms = { d: 86400000, h: 3600000, m: 60000, s: 1000 }[unit] || 86400000;
  return new Date(Date.now() + value * ms);
}

// ── Schemas ─────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  totpCode: z.string().optional(),
});

// ── POST /auth/register ─────────────────────────────────────────

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await dbRequest('/users', {
      method: 'POST',
      body: JSON.stringify({
        email: body.email,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
      }),
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    await dbRequest(`/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ emailVerificationToken: verificationToken, emailVerificationExpiry: verificationExpiry }),
    });

    // Send verification email (non-blocking)
    const verifyLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
    notifyRequest('/send-template', {
      userId: user.id,
      to: user.email,
      template: 'email-verification',
      data: { name: user.firstName || user.email, link: verifyLink },
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    await dbRequest('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        userId: user.id,
        refreshToken,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
        expiresAt: getRefreshExpiry().toISOString(),
      }),
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, emailVerified: user.emailVerified },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    if (err.status === 409 || err.message?.includes('Unique constraint')) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    next(err);
  }
});

// ── POST /auth/login ────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);

    let user: any;
    try {
      user = await dbRequest(`/users/email/${encodeURIComponent(body.email)}`);
    } catch {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.totpEnabled) {
      if (!body.totpCode) {
        res.status(403).json({ error: 'TOTP code required', totpRequired: true });
        return;
      }
      const isValid = authenticator.verify({ token: body.totpCode, secret: user.totpSecret });
      if (!isValid) {
        res.status(401).json({ error: 'Invalid TOTP code' });
        return;
      }
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    await dbRequest('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        userId: user.id,
        refreshToken,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
        expiresAt: getRefreshExpiry().toISOString(),
      }),
    });

    res.json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    next(err);
  }
});

// ── POST /auth/refresh ──────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'refreshToken required' });
      return;
    }

    let session: any;
    try {
      session = await dbRequest(`/sessions/token/${refreshToken}`);
    } catch {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    if (new Date(session.expiresAt) < new Date()) {
      await dbRequest(`/sessions/${session.id}`, { method: 'DELETE' });
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }

    // Rotate refresh token
    await dbRequest(`/sessions/${session.id}`, { method: 'DELETE' });

    const user = session.user;
    const tokens = generateTokens(user.id, user.email, user.role);

    await dbRequest('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        userId: user.id,
        refreshToken: tokens.refreshToken,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
        expiresAt: getRefreshExpiry().toISOString(),
      }),
    });

    res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/logout ───────────────────────────────────────────

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        const session = await dbRequest(`/sessions/token/${refreshToken}`);
        await dbRequest(`/sessions/${(session as any).id}`, { method: 'DELETE' });
      } catch {
        // Token already invalid, no-op
      }
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/totp/setup ───────────────────────────────────────

router.post('/totp/setup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.slice(7);
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_ACCESS_SECRET);
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(payload.email, 'SaaS-IA', secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    // Store secret temporarily (user must verify before enabling)
    await dbRequest(`/users/${payload.sub}`, {
      method: 'PATCH',
      body: JSON.stringify({ totpSecret: secret }),
    });

    res.json({ secret, qrCodeUrl, otpauth });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/totp/verify ──────────────────────────────────────

router.post('/totp/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.slice(7);
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_ACCESS_SECRET);
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: 'code required' });
      return;
    }

    const user = await dbRequest(`/users/${payload.sub}`);
    const isValid = authenticator.verify({ token: code, secret: (user as any).totpSecret });
    if (!isValid) {
      res.status(400).json({ error: 'Invalid TOTP code' });
      return;
    }

    await dbRequest(`/users/${payload.sub}`, {
      method: 'PATCH',
      body: JSON.stringify({ totpEnabled: true }),
    });

    res.json({ message: '2FA enabled successfully' });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/totp/disable ─────────────────────────────────────

router.post('/totp/disable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.slice(7);
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_ACCESS_SECRET);
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    await dbRequest(`/users/${payload.sub}`, {
      method: 'PATCH',
      body: JSON.stringify({ totpEnabled: false, totpSecret: null }),
    });

    res.json({ message: '2FA disabled successfully' });
  } catch (err) {
    next(err);
  }
});

// ── GET /auth/me ────────────────────────────────────────────────

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.slice(7);
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_ACCESS_SECRET);
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const user = await dbRequest(`/users/${payload.sub}`);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ── GET /auth/verify-email ──────────────────────────────────────

router.get('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query as { token: string };
    if (!token) {
      res.status(400).json({ error: 'Token required' });
      return;
    }

    // Find user by token via DB
    let user: any;
    try {
      user = await dbRequest(`/users/verify-token/${token}`);
    } catch {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    if (!user || new Date(user.emailVerificationExpiry) < new Date()) {
      res.status(400).json({ error: 'Token expired' });
      return;
    }

    await dbRequest(`/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ emailVerified: true, emailVerificationToken: null, emailVerificationExpiry: null }),
    });

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/forgot-password ───────────────────────────────────

router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email required' });
      return;
    }

    let user: any;
    try {
      user = await dbRequest(`/users/email/${encodeURIComponent(email)}`);
    } catch {
      // Don't reveal if email exists
      res.json({ message: 'If this email exists, a reset link has been sent.' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 3600 * 1000).toISOString();

    await dbRequest(`/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ passwordResetToken: resetToken, passwordResetExpiry: resetExpiry }),
    });

    const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
    notifyRequest('/send-template', {
      userId: user.id,
      to: user.email,
      template: 'password-reset',
      data: { name: user.firstName || user.email, link: resetLink },
    });

    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/reset-password ────────────────────────────────────

router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ error: 'Token and password required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    let user: any;
    try {
      user = await dbRequest(`/users/reset-token/${token}`);
    } catch {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    if (!user || new Date(user.passwordResetExpiry) < new Date()) {
      res.status(400).json({ error: 'Token expired' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await dbRequest(`/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ passwordHash, passwordResetToken: null, passwordResetExpiry: null }),
    });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

// ── OAuth providers config ───────────────────────────────────────

const OAUTH_PROVIDERS: Record<string, any> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    scope: 'openid email profile',
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userUrl: 'https://api.github.com/user',
    clientId: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    scope: 'read:user user:email',
  },
  discord: {
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userUrl: 'https://discord.com/api/users/@me',
    clientId: DISCORD_CLIENT_ID,
    clientSecret: DISCORD_CLIENT_SECRET,
    scope: 'identify email',
  },
};

// ── GET /auth/oauth/:provider ─────────────────────────────────────

router.get('/oauth/:provider', (req: Request, res: Response) => {
  const provider = OAUTH_PROVIDERS[req.params.provider];
  if (!provider) {
    res.status(400).json({ error: 'Unknown provider' });
    return;
  }
  if (!provider.clientId) {
    res.status(503).json({ error: `${req.params.provider} OAuth not configured` });
    return;
  }

  const callbackUrl = `${req.protocol}://${req.get('host')}/auth/oauth/${req.params.provider}/callback`;
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: callbackUrl,
    scope: provider.scope,
    response_type: 'code',
    state,
  });

  res.redirect(`${provider.authUrl}?${params.toString()}`);
});

// ── GET /auth/oauth/:provider/callback ───────────────────────────

router.get('/oauth/:provider/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const providerName = req.params.provider;
    const provider = OAUTH_PROVIDERS[providerName];
    if (!provider) {
      res.redirect(`${FRONTEND_URL}/login?error=unknown_provider`);
      return;
    }

    const { code, error } = req.query as { code?: string; error?: string };
    if (error || !code) {
      res.redirect(`${FRONTEND_URL}/login?error=${error || 'oauth_cancelled'}`);
      return;
    }

    const callbackUrl = `${req.protocol}://${req.get('host')}/auth/oauth/${providerName}/callback`;

    // Exchange code for access token
    const tokenParams: Record<string, string> = {
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code',
    };

    const tokenRes = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams(tokenParams).toString(),
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenData.access_token) {
      res.redirect(`${FRONTEND_URL}/login?error=token_exchange_failed`);
      return;
    }

    // Get user info
    const userRes = await fetch(provider.userUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
    });
    const oauthUser: any = await userRes.json();

    // Normalize user data per provider
    let email = oauthUser.email;
    let firstName = oauthUser.given_name || oauthUser.name?.split(' ')[0] || oauthUser.username || oauthUser.global_name || '';
    let lastName = oauthUser.family_name || oauthUser.name?.split(' ').slice(1).join(' ') || '';
    const oauthId = String(oauthUser.id);

    // GitHub: email may need separate fetch
    if (providerName === 'github' && !email) {
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const emails = (await emailRes.json()) as any[];
      email = emails.find((e) => e.primary)?.email || emails[0]?.email;
    }

    if (!email) {
      res.redirect(`${FRONTEND_URL}/login?error=no_email`);
      return;
    }

    // Find or create user
    let user: any;
    try {
      user = await dbRequest(`/users/email/${encodeURIComponent(email)}`);
    } catch {
      // User doesn't exist — create
      user = await dbRequest('/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          passwordHash: null,
          firstName,
          lastName,
          emailVerified: true,
          oauthProvider: providerName,
          oauthProviderId: oauthId,
        }),
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    await dbRequest('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        userId: user.id,
        refreshToken,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
        expiresAt: getRefreshExpiry().toISOString(),
      }),
    });

    // Redirect to frontend with tokens
    const params = new URLSearchParams({ accessToken, refreshToken, userId: user.id });
    res.redirect(`${FRONTEND_URL}/oauth/callback?${params.toString()}`);
  } catch (err) {
    next(err);
  }
});

export default router;
