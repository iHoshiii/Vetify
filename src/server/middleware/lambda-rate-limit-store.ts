import type { Options, Store } from 'express-rate-limit';
import { env } from '../config/env';
import { incrementRateLimit, rateLimitId, rateLimitsCollection } from '../models/rate-limit';

export class LambdaRateLimitStore implements Store {
  localKeys = false;
  readonly prefix: string;
  private windowMs = 60_000;

  constructor(private readonly scope: string) {
    this.prefix = `${scope}:`;
  }
  init(options: Options) {
    this.windowMs = options.windowMs;
  }
  increment(key: string) {
    return incrementRateLimit(this.scope, key, this.windowMs);
  }
  async decrement(key: string) {
    await rateLimitsCollection().updateOne({ _id: rateLimitId(this.scope, key) }, [
      {
        $set: {
          totalHits: { $max: [0, { $subtract: ['$totalHits', 1] }] },
        },
      },
    ]);
  }
  async resetKey(key: string) {
    await rateLimitsCollection().deleteOne({ _id: rateLimitId(this.scope, key) });
  }
  async resetAll() {
    await rateLimitsCollection().deleteMany({ scope: this.scope });
  }
}

export const lambdaRateLimitStore = (scope: string): Store | undefined =>
  env.REALTIME_MANAGEMENT_ENDPOINT ? new LambdaRateLimitStore(scope) : undefined;
