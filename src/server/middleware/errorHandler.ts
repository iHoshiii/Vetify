import type { NextFunction, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import { ZodError } from 'zod';

import { isProduction } from '../config/env';
import { AppError } from '../utils/AppError';
import { fail } from '../utils/response';

/** Duplicate key on a unique index. */
const DUPLICATE_KEY = 11000;
/** A write rejected by a collection's own `$jsonSchema` validator. */
const DOCUMENT_VALIDATION_FAILED = 121;

/**
 * Thrown by the ObjectId constructor for a string that cannot be an id. Matched
 * by name because the driver re-exports ObjectId from `bson` but not the error
 * class, and reaching into `bson` directly would mean depending on a package
 * this project does not declare.
 */
function isBsonError(err: unknown): boolean {
  return err instanceof Error && err.name === 'BSONError';
}

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

  // Replaces Mongoose's ValidationError. Validation now happens in Zod, both at
  // the route boundary and again in the data layer before a write, so a rejected
  // document arrives here as a ZodError with the same field-keyed shape.
  if (err instanceof ZodError) {
    fail(res, 400, 'Validation failed.', err.flatten().fieldErrors);
    return;
  }

  // Replaces Mongoose's CastError: an id that cannot be an ObjectId. Mongoose
  // cast query values implicitly and raised this itself; the driver does not, so
  // it comes from the explicit conversion in models/object-id.ts.
  if (isBsonError(err)) {
    fail(res, 400, 'Invalid id.');
    return;
  }

  if (err instanceof MongoServerError) {
    if (err.code === DUPLICATE_KEY) {
      fail(res, 409, 'That value is already taken.');
      return;
    }

    if (err.code === DOCUMENT_VALIDATION_FAILED) {
      fail(res, 400, 'Validation failed.');
      return;
    }
  }

  console.error('[error]', err);

  // Unexpected failures reveal nothing in production; the log has the detail.
  fail(res, 500, isProduction ? 'Internal server error.' : String((err as Error)?.message ?? err));
}
