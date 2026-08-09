import crypto from 'node:crypto';

import { Schema, Types, model, type HydratedDocument, type Model } from 'mongoose';

export type RefreshTokenAttrs = {
  tokenHash: string;
  user: Types.ObjectId;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type RefreshTokenMethods = {
  isActive(): boolean;
};

export type RefreshTokenModel = Model<
  RefreshTokenAttrs,
  Record<string, never>,
  RefreshTokenMethods
>;
export type RefreshTokenDoc = HydratedDocument<RefreshTokenAttrs, RefreshTokenMethods>;

const refreshTokenSchema = new Schema<RefreshTokenAttrs, RefreshTokenModel, RefreshTokenMethods>(
  {
    // SHA-256 of the token, never the token itself: a database leak must not
    // hand out usable sessions. A fast digest rather than bcrypt is right here
    // because the input is 256 bits of entropy, not a guessable password — and
    // rotation needs lookup-by-value, which bcrypt's per-row salt prevents.
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // Set when the token is rotated or logged out. Presence means "spent".
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'refreshtokens',
  }
);

// Mongo drops documents once expiresAt passes, so revoked and stale rows do not
// accumulate. The sweep runs about once a minute, so it is a cleanup mechanism
// and not an access-control one — isActive() below is what actually gates use.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.methods.isActive = function isActive(this: RefreshTokenDoc): boolean {
  return !this.revokedAt && this.expiresAt.getTime() > Date.now();
};

/** Digest helper so callers never have to remember the algorithm. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const RefreshToken = model<RefreshTokenAttrs, RefreshTokenModel>(
  'RefreshToken',
  refreshTokenSchema
);
