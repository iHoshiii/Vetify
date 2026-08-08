import type { Response } from 'express';

/** Shape shared by every non-2xx response, so clients can branch on one field. */
export type ErrorBody = {
  error: string;
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
