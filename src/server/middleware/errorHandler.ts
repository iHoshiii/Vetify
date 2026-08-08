import type { NextFunction, Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';

import { isProduction } from '../config/env';
import { AppError } from '../utils/AppError';
import { fail } from '../utils/response';

export function notFoundHandler(req: Request, res: Response): void {
  fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

/**
 * Terminal error middleware. Express 5 forwards rejected async handlers here
 * automatically, so route code can throw without a try/catch wrapper.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
    return;
  }

  if (err instanceof MongooseError.ValidationError) {
    const issues = Object.fromEntries(
      Object.entries(err.errors).map(([path, e]) => [path, [e.message]])
    );
    fail(res, 400, 'Validation failed.', issues);
    return;
  }

  if (err instanceof MongooseError.CastError) {
    fail(res, 400, `Invalid value for ${err.path}.`);
    return;
  }

  // Duplicate key — surfaces as a plain MongoServerError, not a Mongoose class.
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    fail(res, 409, 'That value is already taken.');
    return;
  }

  console.error('[error]', err);

  // Unexpected failures reveal nothing in production; the log has the detail.
  fail(res, 500, isProduction ? 'Internal server error.' : String((err as Error)?.message ?? err));
}
