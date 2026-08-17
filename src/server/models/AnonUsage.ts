import { ANON_USAGE_TTL_DAYS } from '@shared/limits';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

/**
 * Chat usage for a visitor with no account, keyed by the opaque id in their
 * signed cookie. Deliberately holds nothing else — no IP, no user agent, no
 * message content — so an anonymous visitor stays anonymous.
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

// Mongo drops the record once it lapses, so an abandoned allowance does not sit
// in the collection forever. Someone returning after that window gets a fresh
// five, which is the intended generosity.
anonUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ANON_USAGE_TTL_MS = ANON_USAGE_TTL_DAYS * 24 * 60 * 60 * 1000;

export const AnonUsage = model<AnonUsageAttrs, AnonUsageModel>('AnonUsage', anonUsageSchema);
