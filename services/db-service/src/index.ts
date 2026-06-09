import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { createLogger, setupMetrics, requestIdMiddleware, createErrorHandler } from '@saas-ia/shared';
import prisma from './prisma.js';
import routes from './routes/index.js';

const SERVICE_NAME = 'db-service';
const PORT = Number(process.env.PORT) || 4001;

const logger = createLogger(SERVICE_NAME);
const { register } = setupMetrics(SERVICE_NAME);

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);
app.use(pinoHttp({ logger }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME });
});

app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: SERVICE_NAME, db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', service: SERVICE_NAME, db: 'disconnected' });
  }
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api', routes);

app.use(createErrorHandler(logger));

app.listen(PORT, '0.0.0.0', async () => {
  await prisma.$connect();
  logger.info(`${SERVICE_NAME} listening on port ${PORT} — database connected`);
});

export default app;
