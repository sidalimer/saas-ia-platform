import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createLogger, setupMetrics, createMetricsMiddleware, requestIdMiddleware, createErrorHandler } from '@saas-ia/shared';

const SERVICE_NAME = 'gateway';
const PORT = Number(process.env.PORT) || 8080;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:4001';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:4002';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:4003';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:4004';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:4005';
const METRICS_SERVICE_URL = process.env.METRICS_SERVICE_URL || 'http://metrics-service:4006';

const logger = createLogger(SERVICE_NAME);
const { register, httpRequestDuration, httpRequestTotal } = setupMetrics(SERVICE_NAME);

const app = express();

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(requestIdMiddleware);
app.use(pinoHttp({ logger }));
app.use(createMetricsMiddleware({ httpRequestDuration, httpRequestTotal }));

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

const proxyOptions = {
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq: import('http').ClientRequest, req: express.Request) => {
      const requestId = req.headers['x-request-id'];
      if (requestId) {
        proxyReq.setHeader('x-request-id', requestId as string);
      }
    },
  },
};

app.use('/api/db', createProxyMiddleware({
  target: DB_SERVICE_URL,
  pathRewrite: { '^/': '/api/' },
  ...proxyOptions,
}));

app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  pathRewrite: { '^/': '/auth/' },
  ...proxyOptions,
}));

app.use('/api/notify', createProxyMiddleware({
  target: NOTIFICATION_SERVICE_URL,
  pathRewrite: { '^/': '/notifications/' },
  ...proxyOptions,
}));

app.use('/api/ai', createProxyMiddleware({
  target: AI_SERVICE_URL,
  pathRewrite: { '^/': '/ai/' },
  ...proxyOptions,
}));

app.use('/api/payments', createProxyMiddleware({
  target: PAYMENT_SERVICE_URL,
  pathRewrite: { '^/': '/payments/' },
  ...proxyOptions,
}));

app.use('/api/metrics', createProxyMiddleware({
  target: METRICS_SERVICE_URL,
  pathRewrite: { '^/': '/metrics/' },
  ...proxyOptions,
}));

app.use(createErrorHandler(logger));

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`${SERVICE_NAME} listening on port ${PORT}`);
});

export default app;
