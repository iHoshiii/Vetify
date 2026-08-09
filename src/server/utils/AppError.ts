/**
 * Errors thrown deliberately by application code, as opposed to unexpected
 * crashes. `errorHandler` trusts the status and message of these and leaks
 * nothing for anything else.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational = true;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request') {
    return new AppError(400, message);
  }

  static unauthorized(message = 'Not authenticated') {
    return new AppError(401, message);
  }

  static forbidden(message = 'Not allowed') {
    return new AppError(403, message);
  }

  static notFound(message = 'Not found') {
    return new AppError(404, message);
  }

  static conflict(message = 'Already exists') {
    return new AppError(409, message);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new AppError(429, message);
  }
}
