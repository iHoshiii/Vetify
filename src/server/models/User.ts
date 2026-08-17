import bcrypt from 'bcryptjs';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

const SALT_ROUNDS = 12;

/** Identity sources. `local` is email + password; the rest arrive via OAuth. */
export const AUTH_PROVIDERS = ['local', 'google', 'facebook', 'tiktok'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export type UserAttrs = {
  email: string;
  /** Absent on OAuth accounts — there is no password to store. */
  password?: string | null;
  name?: string | null;
  provider: AuthProvider;
  /** The provider's own stable user id (Google `sub`, TikTok `open_id`, …). */
  providerId?: string | null;
  avatarUrl?: string | null;
  /** True when the provider vouches for the address, or after our own verify. */
  emailVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

/** Shape safe to serialise to a client — never includes the hash. */
export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  provider: AuthProvider;
  avatarUrl: string | null;
  emailVerified: boolean;
};

export type UserMethods = {
  comparePassword(candidate: string): Promise<boolean>;
  toPublic(): PublicUser;
};

// Declared explicitly rather than via InferSchemaType so that documents
// returned by queries (findById, findOne) carry the instance methods too.
export type UserModel = Model<UserAttrs, Record<string, never>, UserMethods>;
export type UserDoc = HydratedDocument<UserAttrs, UserMethods>;

const userSchema = new Schema<UserAttrs, UserModel, UserMethods>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      // Required only for local accounts. An OAuth user never picks a password,
      // and forcing a random one just creates an unusable credential.
      required: [
        function requiredForLocal(this: UserDoc) {
          return this.provider === 'local';
        },
        'Password is required',
      ],
      // Excluded from queries by default so a stray res.json(user) cannot leak
      // the hash. Auth code opts back in with .select('+password').
      select: false,
    },
    name: {
      type: String,
      trim: true,
    },
    provider: {
      type: String,
      enum: AUTH_PROVIDERS,
      required: true,
      default: 'local',
    },
    providerId: {
      type: String,
      default: null,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Looking a returning OAuth user up by (provider, providerId) is the hot path on
// every social login. Sparse so the millions of local accounts, which have no
// providerId, don't all collide on null.
userSchema.index({ provider: 1, providerId: 1 }, { unique: true, sparse: true });

/**
 * Hashes on save. Note this does NOT run for findOneAndUpdate/updateOne —
 * Mongoose skips document middleware for query-level updates. Every password
 * write must go through doc.save() or it will store plaintext.
 */
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  if (!this.password) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

/**
 * Always false for OAuth accounts. Returning false rather than throwing means a
 * password login attempt against a Google-only account is just a failed login,
 * indistinguishable from a wrong password — no account enumeration.
 */
userSchema.methods.comparePassword = function comparePassword(
  this: UserDoc,
  candidate: string
): Promise<boolean> {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublic = function toPublic(this: UserDoc): PublicUser {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name ?? null,
    provider: this.provider,
    avatarUrl: this.avatarUrl ?? null,
    emailVerified: this.emailVerified,
  };
};

export const User = model<UserAttrs, UserModel>('User', userSchema);
