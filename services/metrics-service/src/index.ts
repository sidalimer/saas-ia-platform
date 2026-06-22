import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { createLogger, setupMetrics, createMetricsMiddleware, requestIdMiddleware, createErrorHandler } from '@saas-ia/shared';

const SERVICE_NAME = 'metrics-service';
const PORT = Number(process.env.PORT) || 4006;

const logger = createLogger(SERVICE_NAME);
const { register, httpRequestDuration, httpRequestTotal } = setupMetrics(SERVICE_NAME);

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
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

app.use(createErrorHandler(logger));

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`${SERVICE_NAME} listening on port ${PORT}`);
});

export default app;
