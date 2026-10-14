export type ApiErrorBody = {
  error?: string;
  /** Some middleware uses the conventional `message` response field. */
  message?: string;
  /** Machine-readable cause, so callers can branch without matching prose. */
  reason?: string;
  issues?: Record<string, string[] | undefined>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly reason?: string;
  readonly issues?: ApiErrorBody['issues'];

  constructor(status: number, message: string, reason?: string, issues?: ApiErrorBody['issues']) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.reason = reason;
    this.issues = issues;
  }
}
