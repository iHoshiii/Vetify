import bcrypt from 'bcryptjs';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

const SALT_ROUNDS = 12;

export type UserAttrs = {
  email: string;
  password: string;
  name?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

/** Shape safe to serialise to a client — never includes the hash. */
export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
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
      required: [true, 'Password is required'],
      // Excluded from queries by default so a stray res.json(user) cannot leak
      // the hash. Auth code opts back in with .select('+password').
      select: false,
    },
    name: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

/**
 * Hashes on save. Note this does NOT run for findOneAndUpdate/updateOne —
 * Mongoose skips document middleware for query-level updates. Every password
 * write must go through doc.save() or it will store plaintext.
 */
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

userSchema.methods.comparePassword = function comparePassword(
  this: UserDoc,
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublic = function toPublic(this: UserDoc): PublicUser {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name ?? null,
  };
};

export const User = model<UserAttrs, UserModel>('User', userSchema);
