/**
 * Errors thrown deliberately by application code, as opposed to unexpected
 * crashes. `errorHandler` trusts the status and message of these and leaks
 * nothing for anything else.
 */
export class AppError extends Error {
  readonly statusCode: number;
  /**
   * Stable code for a refusal the client has to react to specifically, surfaced
   * as the `reason` field every other error response already carries.
   *
   * Optional because most refusals only need their status: 404 means 404. It
   * earns its place where one status covers several different refusals — an
   * admin told "409" wants to know whether they just tried to demote themselves
   * or to remove the last admin, and the prose is not something a UI should be
   * matching on.
   */
  readonly reason?: string;
  readonly isOperational = true;

  constructor(statusCode: number, message: string, reason?: string) {
    super(message);
    this.statusCode = statusCode;
    this.reason = reason;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', reason?: string) {
    return new AppError(400, message, reason);
  }

  static unauthorized(message = 'Not authenticated', reason?: string) {
    return new AppError(401, message, reason);
  }

  static forbidden(message = 'Not allowed', reason?: string) {
    return new AppError(403, message, reason);
  }

  static notFound(message = 'Not found', reason?: string) {
    return new AppError(404, message, reason);
  }

  static conflict(message = 'Already exists', reason?: string) {
    return new AppError(409, message, reason);
  }

  static tooManyRequests(message = 'Too many requests', reason?: string) {
    return new AppError(429, message, reason);
  }
}
