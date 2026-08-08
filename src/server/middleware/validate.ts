import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';

import { fail } from '../utils/response';

/**
 * Replaces req.body with the parsed result, so downstream handlers get the
 * coerced-and-defaulted value rather than the raw payload.
 */
export function validate<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      fail(res, 400, 'Invalid request payload.', parsed.error.flatten().fieldErrors);
      return;
    }

    req.body = parsed.data;
    next();
  };
}

/** Same, for query strings. */
export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);

    if (!parsed.success) {
      fail(res, 400, 'Invalid query parameters.', parsed.error.flatten().fieldErrors);
      return;
    }

    // req.query is a getter-only property in Express 5, so cache the parsed
    // value on the request instead of assigning through it.
    (req as Request & { validatedQuery?: z.infer<T> }).validatedQuery = parsed.data;
    next();
  };
}

export { ZodError };
