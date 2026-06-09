import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:4001';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'dev-internal-key-change-me';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const PAYMENT_MODE = process.env.PAYMENT_MODE || 'mock'; // 'mock' | 'stripe'

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

const createCheckoutSchema = z.object({
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  interval: z.enum(['MONTHLY', 'YEARLY']),
});

const webhookSchema = z.object({
  type: z.string(),
  data: z.object({
    userId: z.string().uuid(),
    planId: z.string().uuid(),
    amount: z.number(),
    stripePaymentId: z.string().optional(),
  }),
});

// ── POST /payments/create-checkout ──────────────────────────────

router.post('/create-checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createCheckoutSchema.parse(req.body);

    const plan = await dbRequest(`/plans/${body.planId}`);
    if (!plan || plan.error) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    const amount = body.interval === 'MONTHLY' ? plan.monthlyPrice : plan.yearlyPrice;

    if (PAYMENT_MODE === 'stripe' && STRIPE_SECRET_KEY) {
      // Real Stripe integration would go here
      res.json({ url: 'https://checkout.stripe.com/mock-session', sessionId: crypto.randomUUID() });
      return;
    }

    // Mock: simulate immediate payment success
    const paymentId = `mock_pay_${crypto.randomUUID()}`;

    await dbRequest('/payments', {
      method: 'POST',
      body: JSON.stringify({
        userId: body.userId,
        amount,
        currency: 'EUR',
        status: 'COMPLETED',
        provider: 'MOCK',
        providerPaymentId: paymentId,
      }),
    });

    // Update subscription
    await dbRequest('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        userId: body.userId,
        planId: body.planId,
        status: 'ACTIVE',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + (body.interval === 'MONTHLY' ? 30 : 365) * 86400000).toISOString(),
      }),
    });

    res.json({
      success: true,
      paymentId,
      amount,
      plan: plan.name,
      interval: body.interval,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    next(err);
  }
});

// ── POST /payments/webhook ──────────────────────────────────────

router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = webhookSchema.parse(req.body);

    if (body.type === 'payment.succeeded') {
      await dbRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({
          userId: body.data.userId,
          amount: body.data.amount,
          currency: 'EUR',
          status: 'COMPLETED',
          provider: 'STRIPE',
          providerPaymentId: body.data.stripePaymentId || crypto.randomUUID(),
        }),
      });
    }

    res.json({ received: true });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid webhook payload' });
      return;
    }
    next(err);
  }
});

// ── GET /payments/history/:userId ───────────────────────────────

router.get('/history/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dbRequest(`/payments/user/${req.params.userId}`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ── GET /payments/plans ─────────────────────────────────────────

router.get('/plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await dbRequest('/plans');
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

export default router;
