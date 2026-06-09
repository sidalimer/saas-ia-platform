import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { createLogger, setupMetrics, requestIdMiddleware, createErrorHandler } from '@saas-ia/shared';
import paymentRoutes from './routes/payments.js';

const SERVICE_NAME = 'payment-service';
const PORT = Number(process.env.PORT) || 4005;
const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:4001';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:4003';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'dev-internal-key-change-me';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const logger = createLogger(SERVICE_NAME);
const { register } = setupMetrics(SERVICE_NAME);

// ── Subscription expiry scheduler ───────────────────────────────
async function checkExpiringSubscriptions(): Promise<void> {
  try {
    const res = await fetch(`${DB_SERVICE_URL}/api/subscriptions`, {
      headers: { 'x-internal-key': INTERNAL_API_KEY },
    });
    if (!res.ok) return;
    const subscriptions = (await res.json()) as any[];

    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 86400000);

    for (const sub of subscriptions) {
      if (sub.status !== 'ACTIVE' || !sub.currentPeriodEnd) continue;
      const endDate = new Date(sub.currentPeriodEnd);
      if (endDate > now && endDate <= in7days) {
        const userRes = await fetch(`${DB_SERVICE_URL}/api/users/${sub.userId}`, {
          headers: { 'x-internal-key': INTERNAL_API_KEY },
        });
        if (!userRes.ok) continue;
        const user = await userRes.json() as any;
        await fetch(`${NOTIFICATION_SERVICE_URL}/notifications/send-template`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-key': INTERNAL_API_KEY },
          body: JSON.stringify({
            userId: sub.userId,
            to: user.email,
            template: 'subscription-end',
            data: {
              name: user.firstName || user.email,
              plan: sub.plan?.name || 'Premium',
              expiryDate: endDate.toLocaleDateString('fr-FR'),
              link: `${FRONTEND_URL}/plans`,
            },
          }),
        });
        logger.info({ userId: sub.userId, expiryDate: sub.currentPeriodEnd }, 'Sent subscription-end notification');
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Subscription expiry check failed');
  }
}

// Run every 24 hours
const SCHEDULER_INTERVAL_MS = 24 * 60 * 60 * 1000;
setInterval(checkExpiringSubscriptions, SCHEDULER_INTERVAL_MS);
// Also run at startup after 30s delay (allow DB service to be ready)
setTimeout(checkExpiringSubscriptions, 30000);

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);
app.use(pinoHttp({ logger }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME });
});

app.get('/ready', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/payments', paymentRoutes);

app.use(createErrorHandler(logger));

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`${SERVICE_NAME} listening on port ${PORT}`);
});

export default app;
