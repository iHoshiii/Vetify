import crypto from 'node:crypto';

import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const refreshTokenSchema = new Schema(
  {
    // SHA-256 of the token, never the token itself: a database leak must not
    // hand out usable sessions. Cheap digest rather than bcrypt is fine here
    // because the input is 256 bits of entropy, not a guessable password.
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

refreshTokenSchema.methods.isActive = function isActive(
  this: HydratedDocument<RefreshTokenAttrs>
): boolean {
  return this.revokedAt === null && this.expiresAt.getTime() > Date.now();
};

/** Digest helper so callers never have to remember the algorithm. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export type RefreshTokenAttrs = InferSchemaType<typeof refreshTokenSchema>;

export type RefreshTokenDoc = HydratedDocument<RefreshTokenAttrs> & {
  isActive(): boolean;
};

export const RefreshToken = model<RefreshTokenAttrs>('RefreshToken', refreshTokenSchema);
