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
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM = process.env.TWILIO_FROM || '+15005550006';
const SMS_MODE = process.env.SMS_MODE || 'mock';
const FIREBASE_SERVER_KEY = process.env.FIREBASE_SERVER_KEY || '';

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
  template: z.enum(['welcome', 'password-reset', 'password-reset-code', 'email-verification', 'payment-receipt', 'subscription-start', 'subscription-end', 'subscription-cancel', 'payment-failed']),
  data: z.record(z.string()).optional(),
});

const sendSmsSchema = z.object({
  userId: z.string().uuid(),
  to: z.string().min(8),
  body: z.string().min(1).max(160),
});

const sendPushSchema = z.object({
  userId: z.string().uuid(),
  deviceToken: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string()).optional(),
});

// ── Templates ───────────────────────────────────────────────────

function renderTemplate(template: string, data: Record<string, string> = {}): { subject: string; html: string } {
  const templates: Record<string, { subject: string; html: string }> = {
    welcome: {
      subject: 'Welcome to SaaS IA!',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1 style="color:#4f46e5">Welcome ${data.name || ''}!</h1><p>Thank you for joining SaaS IA. Get started by exploring our AI features.</p><a href="${data.link || '#'}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Get Started</a></div>`,
    },
    'password-reset': {
      subject: 'Reset your password — SaaS IA',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1 style="color:#4f46e5">Password Reset</h1><p>Hello ${data.name || ''},</p><p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p><a href="${data.link || '#'}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Reset Password</a><p style="color:#888;font-size:12px;margin-top:24px">If you didn't request this, please ignore this email.</p></div>`,
    },
    'password-reset-code': {
      subject: 'Your password reset code — SaaS IA',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1 style="color:#4f46e5">Password Reset Code</h1><p>Hello ${data.name || ''},</p><p>Use the code below to reset your password. It expires in <strong>1 hour</strong>.</p><div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:24px 0"><span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4f46e5">${data.code || '------'}</span></div><p style="color:#888;font-size:12px">If you didn't request this, please ignore this email.</p></div>`,
    },
    'email-verification': {
      subject: 'Verify your email — SaaS IA',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1 style="color:#4f46e5">Verify your email</h1><p>Hello ${data.name || ''},</p><p>Click the button below to confirm your email address.</p><a href="${data.link || '#'}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Verify Email</a><p style="color:#888;font-size:12px;margin-top:24px">This link expires in 24 hours.</p></div>`,
    },
    'payment-receipt': {
      subject: 'Payment Receipt — SaaS IA',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1 style="color:#4f46e5">Payment Confirmed ✓</h1><p>Hello ${data.name || ''},</p><p>Your payment has been processed successfully.</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><td style="padding:8px;border-bottom:1px solid #eee">Plan</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${data.plan || 'N/A'}</strong></td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee">Amount</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${data.amount || '0'}€</strong></td></tr><tr><td style="padding:8px">Billing</td><td style="padding:8px">${data.interval || 'Monthly'}</td></tr></table><p>Thank you for your subscription!</p></div>`,
    },
    'subscription-start': {
      subject: 'Your subscription is now active — SaaS IA',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1 style="color:#4f46e5">Subscription Active 🎉</h1><p>Hello ${data.name || ''},</p><p>Your <strong>${data.plan || 'Premium'}</strong> subscription is now active.</p><p>Renewal date: <strong>${data.renewalDate || 'N/A'}</strong></p><p>Enjoy unlimited AI features!</p></div>`,
    },
    'subscription-end': {
      subject: 'Your subscription expires soon — SaaS IA',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1 style="color:#f59e0b">Subscription Expiring Soon</h1><p>Hello ${data.name || ''},</p><p>Your <strong>${data.plan || 'Premium'}</strong> subscription expires on <strong>${data.expiryDate || 'N/A'}</strong>.</p><p>Renew now to keep access to all AI features.</p><a href="${data.link || '#'}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Renew Subscription</a></div>`,
    },
    'subscription-cancel': {
      subject: 'Subscription cancelled — SaaS IA',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1 style="color:#ef4444">Subscription Cancelled</h1><p>Hello ${data.name || ''},</p><p>Your subscription has been cancelled. You will continue to have access until <strong>${data.expiryDate || 'the end of the current period'}</strong>.</p><p>We're sorry to see you go. You can resubscribe at any time.</p></div>`,
    },
    'payment-failed': {
      subject: 'Payment failed — Action required — SaaS IA',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1 style="color:#ef4444">Payment Failed</h1><p>Hello ${data.name || ''},</p><p>We were unable to process your payment of <strong>${data.amount || '0'}€</strong> for your <strong>${data.plan || 'SaaS IA'}</strong> subscription.</p><p>Please update your payment method to avoid service interruption.</p><a href="${data.link || '#'}" style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Update Payment</a></div>`,
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

// ── POST /notifications/send-sms ────────────────────────────────

router.post('/send-sms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = sendSmsSchema.parse(req.body);
    let status = 'SENT';

    if (SMS_MODE === 'twilio' && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const twilioRes = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        },
        body: new URLSearchParams({ From: TWILIO_FROM, To: body.to, Body: body.body }).toString(),
      });
      if (!twilioRes.ok) status = 'FAILED';
    } else {
      console.log(`[SMS MOCK] To: ${body.to} | Message: ${body.body}`);
    }

    await dbRequest('/notifications', {
      method: 'POST',
      body: JSON.stringify({
        userId: body.userId,
        type: 'SMS',
        subject: 'SMS',
        body: body.body,
        status,
        sentAt: new Date().toISOString(),
      }),
    });

    res.json({ message: 'SMS sent', to: body.to, mode: SMS_MODE });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    next(err);
  }
});

// ── POST /notifications/send-push ───────────────────────────────

router.post('/send-push', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = sendPushSchema.parse(req.body);
    let status = 'SENT';

    if (FIREBASE_SERVER_KEY) {
      const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `key=${FIREBASE_SERVER_KEY}` },
        body: JSON.stringify({
          to: body.deviceToken,
          notification: { title: body.title, body: body.body },
          data: body.data || {},
        }),
      });
      if (!fcmRes.ok) status = 'FAILED';
    } else {
      console.log(`[PUSH MOCK] To: ${body.deviceToken} | ${body.title}: ${body.body}`);
    }

    await dbRequest('/notifications', {
      method: 'POST',
      body: JSON.stringify({
        userId: body.userId,
        type: 'PUSH',
        subject: body.title,
        body: body.body,
        status,
        sentAt: new Date().toISOString(),
      }),
    });

    res.json({ message: 'Push notification sent', mode: FIREBASE_SERVER_KEY ? 'firebase' : 'mock' });
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
