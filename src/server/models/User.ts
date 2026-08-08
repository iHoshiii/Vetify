import bcrypt from 'bcryptjs';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const SALT_ROUNDS = 12;

const userSchema = new Schema(
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
      // Excluded from queries by default so a stray res.json(user) can't leak
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
  this: HydratedDocument<UserAttrs>,
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

/** Shape safe to serialise to a client — never includes the hash. */
userSchema.methods.toPublic = function toPublic(this: HydratedDocument<UserAttrs>) {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name ?? null,
  };
};

export type UserAttrs = InferSchemaType<typeof userSchema>;

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
};

export type UserDoc = HydratedDocument<UserAttrs> & {
  comparePassword(candidate: string): Promise<boolean>;
  toPublic(): PublicUser;
};

export const User = model<UserAttrs>('User', userSchema);
