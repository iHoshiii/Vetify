import type { NextFunction, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import { ZodError } from 'zod';

import { isProduction } from '../config/env';
import { AppError } from '../utils/AppError';
import { fail, failReason } from '../utils/response';

const DUPLICATE_KEY = 11000;
const DOCUMENT_VALIDATION_FAILED = 121;

// return true if err is a kind of Error and err name is strictly equal to 'BSONError'
// else return false
function isBsonError(err: unknown): boolean {
  return err instanceof Error && err.name === 'BSONError';
}

// sends (response) the 404 error to the client (page not found)
export function notFoundHandler(req: Request, res: Response): void {
  fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

// if the response is sent
// pass the error to the next middleware
export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  // if err is an instance of AppError
  if (err instanceof AppError) {
    // The reason is optional, and a body carrying `reason: undefined` is not the
    // same shape as one without the field, so the two cases stay separate.
    if (err.reason) failReason(res, err.statusCode, err.message, err.reason);
    else fail(res, err.statusCode, err.message);
    return;
  }

  // if err is an instance of ZodError, reponse 'Validation failed.' with status code 400
  if (err instanceof ZodError) {
    fail(res, 400, 'Validation failed.', err.flatten().fieldErrors);
    return;
  }

  // if the error is a BSONError, response 'invalid id' with status code 400
  if (isBsonError(err)) {
    fail(res, 400, 'Invalid id.');
    return;
  }

  // if the error is MongoServerError,
  if (err instanceof MongoServerError) {
    // if error code is equal to 11000 (mongodb error for duplicate key)
    if (err.code === DUPLICATE_KEY) {
      fail(res, 409, 'That value is already taken.');
      return;
    }

    // if error is equal to 121 (mongodb error for document validation failed)
    if (err.code === DOCUMENT_VALIDATION_FAILED) {
      fail(res, 400, 'Validation failed.');
      return;
    }
  }

  console.error('[error]', err);

  // Unexpected failures reveal nothing in production; the log has the detail.
  fail(res, 500, isProduction ? 'Internal server error.' : String((err as Error)?.message ?? err));
}
