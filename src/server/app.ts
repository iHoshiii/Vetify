import cookieParser from 'cookie-parser';
import express from 'express';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { applySecurity, generalLimiter } from './middleware/security';
import routes from './routes';

/**
 * Builds the app without binding a port, so tests can drive it via supertest
 * and `index.ts` owns the only `listen` call.
 */
export function createApp() {
  const app = express();

  // Behind a proxy/load balancer, so rate limiting keys off the real client IP.
  app.set('trust proxy', 1);

  applySecurity(app);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use('/api', generalLimiter, routes);

  // Order matters: unmatched routes, then the terminal error handler.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
