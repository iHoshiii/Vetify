import { ANON_QUOTA_WINDOW_HOURS } from '@shared/limits';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

/**
 * Chat usage for a visitor with no account during the current allowance window,
 * keyed by the opaque id in their signed cookie. Deliberately holds nothing else
 * — no IP, no user agent, no message content — so an anonymous visitor stays
 * anonymous.
 */
export type AnonUsageAttrs = {
  anonId: string;
  chatCount: number;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type AnonUsageModel = Model<AnonUsageAttrs>;
export type AnonUsageDoc = HydratedDocument<AnonUsageAttrs>;

const anonUsageSchema = new Schema<AnonUsageAttrs, AnonUsageModel>(
  {
    anonId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    chatCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'anonusages',
  }
);

// Mongo drops the record when the window closes, and the next question inserts a
// fresh one — that expiry IS the reset, so there is no separate cleanup job.
// Note the TTL monitor sweeps about once a minute, so a lapsed record can linger
// briefly past its expiry. A visitor being a minute early to their next
// allowance is not worth a second mechanism to prevent.
anonUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ANON_QUOTA_WINDOW_MS = ANON_QUOTA_WINDOW_HOURS * 60 * 60 * 1000;

export const AnonUsage = model<AnonUsageAttrs, AnonUsageModel>('AnonUsage', anonUsageSchema);
