import { Router, Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const router = Router();

const SMTP_HOST = process.env.SMTP_HOST || 'mailhog';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 1025;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@saas-ia.local';
const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:4001';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'dev-internal-key-change-me';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
});

async function dbRequest(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${DB_SERVICE_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-internal-key': INTERNAL_API_KEY,
      ...(options.headers || {}),
    },
  });
  return res.json();
}

// ── Schemas ─────────────────────────────────────────────────────

const sendEmailSchema = z.object({
  userId: z.string().uuid(),
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  html: z.string().optional(),
});

const templateEmailSchema = z.object({
  userId: z.string().uuid(),
  to: z.string().email(),
  template: z.enum(['welcome', 'password-reset', 'email-verification', 'payment-receipt']),
  data: z.record(z.string()).optional(),
});

// ── Templates ───────────────────────────────────────────────────

function renderTemplate(template: string, data: Record<string, string> = {}): { subject: string; html: string } {
  const templates: Record<string, { subject: string; html: string }> = {
    welcome: {
      subject: 'Welcome to SaaS IA!',
      html: `<h1>Welcome ${data.name || ''}!</h1><p>Thank you for joining SaaS IA. Get started by exploring our AI features.</p>`,
    },
    'password-reset': {
      subject: 'Reset your password',
      html: `<h1>Password Reset</h1><p>Click <a href="${data.link || '#'}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    },
    'email-verification': {
      subject: 'Verify your email',
      html: `<h1>Email Verification</h1><p>Click <a href="${data.link || '#'}">here</a> to verify your email address.</p>`,
    },
    'payment-receipt': {
      subject: 'Payment Receipt',
      html: `<h1>Payment Confirmed</h1><p>Amount: ${data.amount || '0'}€<br>Plan: ${data.plan || 'N/A'}<br>Thank you!</p>`,
    },
  };
  return templates[template] || { subject: 'Notification', html: `<p>${data.message || ''}</p>` };
}

// ── POST /notifications/send ────────────────────────────────────

router.post('/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = sendEmailSchema.parse(req.body);

    await transporter.sendMail({
      from: SMTP_FROM,
      to: body.to,
      subject: body.subject,
      text: body.body,
      html: body.html || body.body,
    });

    // Store in DB
    await dbRequest('/notifications', {
      method: 'POST',
      body: JSON.stringify({
        userId: body.userId,
        type: 'EMAIL',
        subject: body.subject,
        body: body.body,
        status: 'SENT',
        sentAt: new Date().toISOString(),
      }),
    });

    res.json({ message: 'Email sent', to: body.to });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    next(err);
  }
});

// ── POST /notifications/send-template ───────────────────────────

router.post('/send-template', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = templateEmailSchema.parse(req.body);
    const { subject, html } = renderTemplate(body.template, body.data);

    await transporter.sendMail({
      from: SMTP_FROM,
      to: body.to,
      subject,
      html,
    });

    await dbRequest('/notifications', {
      method: 'POST',
      body: JSON.stringify({
        userId: body.userId,
        type: 'EMAIL',
        subject,
        body: html,
        status: 'SENT',
        sentAt: new Date().toISOString(),
      }),
    });

    res.json({ message: 'Template email sent', template: body.template, to: body.to });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    next(err);
  }
});

// ── GET /notifications/user/:userId ─────────────────────────────

router.get('/user/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dbRequest(`/notifications/user/${req.params.userId}`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
