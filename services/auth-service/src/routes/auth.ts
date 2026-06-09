import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

const router = Router();

const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:4001';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'dev-internal-key-change-me';
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me-in-production';
// JWT_REFRESH_SECRET reserved for signed refresh tokens in future
void process.env.JWT_REFRESH_SECRET;
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ── Helpers ─────────────────────────────────────────────────────

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
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
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

export default router;
