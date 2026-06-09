import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Logger } from 'pino';
import { AppError } from './errors.js';

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  next();
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      logger.warn({ err, statusCode: err.statusCode, code: err.code }, err.message);
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
      return;
    }

    logger.error({ err }, 'Unhandled error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  };
}

export function internalKeyAuth(internalKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['x-internal-key'];
    if (key !== internalKey) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid internal key' },
      });
      return;
    }
    next();
  };
}
