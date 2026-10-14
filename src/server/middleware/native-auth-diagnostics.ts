import type { RequestHandler } from 'express';
import { appendFile } from 'node:fs/promises';
import { env } from '../config/env';

const observedPaths = new Set(
  ['login', 'signup', 'refresh', 'exchange', 'logout', 'oauth/exchange'].map(
    (action) => `/api/v1/auth/native/${action}`
  )
);
let requestCounter = 0;
let diagnosticWrites: Promise<void> = Promise.resolve();
let fileWarningReported = false;

function report(message: string) {
  console.info(message);
  const line = `${new Date().toISOString()} pid=${process.pid} ${message}\n`;
  diagnosticWrites = diagnosticWrites
    .then(() => appendFile('native-auth-dev.log', line, 'utf8'))
    .catch(() => {
      if (!fileWarningReported) {
        fileWarningReported = true;
        console.warn('[native-auth] Could not write the local development diagnostic log.');
      }
    });
}

export const nativeAuthDiagnostics: RequestHandler = (req, res, next) => {
  if (env.NODE_ENV !== 'development' || req.method !== 'POST' || !observedPaths.has(req.path)) {
    next();
    return;
  }

  const label = `[native-auth] #${++requestCounter} POST ${req.path}`;
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  report(`${label} received`);

  const cleanup = () => {
    res.removeListener('finish', finished);
    res.removeListener('close', closed);
  };
  const finished = () => {
    cleanup();
    report(`${label} finished HTTP ${res.statusCode} in ${elapsed()}ms`);
  };
  const closed = () => {
    cleanup();
    if (!res.writableFinished) {
      report(`${label} interrupted after ${elapsed()}ms (bodyComplete=${req.complete})`);
    }
  };
  res.once('finish', finished);
  res.once('close', closed);
  next();
};
