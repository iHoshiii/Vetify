import type { Response } from 'express';

/** Shape shared by every non-2xx response, so clients can branch on one field. */
export type ErrorBody = {
  error: string;
  /** Stable machine-readable cause. Clients branch on this, never on the prose. */
  reason?: string;
  issues?: Record<string, string[] | undefined>;
};

export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json(data);
}

export function created<T>(res: Response, data: T): Response {
  return res.status(201).json(data);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function fail(
  res: Response,
  status: number,
  error: string,
  issues?: ErrorBody['issues']
): Response {
  const body: ErrorBody = { error };
  if (issues) body.issues = issues;
  return res.status(status).json(body);
}

/** fail() plus a reason code, for refusals the client has to react to specifically. */
export function failReason(res: Response, status: number, error: string, reason: string): Response {
  return res.status(status).json({ error, reason } satisfies ErrorBody);
}
