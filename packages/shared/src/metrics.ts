import client from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

export function setupMetrics(serviceName: string) {
  const register = new client.Registry();
  register.setDefaultLabels({ service: serviceName });
  client.collectDefaultMetrics({ register });

  const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
    registers: [register],
  });

  const httpRequestTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [register],
  });

  return { register, httpRequestDuration, httpRequestTotal };
}

type MetricsBundle = ReturnType<typeof setupMetrics>;

export function createMetricsMiddleware(metrics: Pick<MetricsBundle, 'httpRequestDuration' | 'httpRequestTotal'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      // Use the matched route pattern when available to avoid high-cardinality labels
      const route = (req.route?.path as string) || req.baseUrl || req.path || 'unknown';
      const labels = { method: req.method, route, status_code: String(res.statusCode) };
      metrics.httpRequestDuration.observe(labels, durationSeconds);
      metrics.httpRequestTotal.inc(labels);
    });
    next();
  };
}

export { client as promClient };
