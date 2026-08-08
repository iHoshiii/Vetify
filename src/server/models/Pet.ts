import { Schema, Types, model, type HydratedDocument, type Model } from 'mongoose';

export type PetAvatar = {
  url: string | null;
  color: string;
  initials: boolean;
};

export type PetAttrs = {
  name: string;
  species: string;
  breed?: string | null;
  age?: number | null;
  weight?: number | null;
  owner: Types.ObjectId;
  avatar?: PetAvatar;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicPet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  weight: number | null;
  ownerId: string;
  avatar: PetAvatar;
};

export type PetMethods = {
  toPublic(): PublicPet;
};

export type PetModel = Model<PetAttrs, Record<string, never>, PetMethods>;
export type PetDoc = HydratedDocument<PetAttrs, PetMethods>;

/**
 * Defaults carried over from the FastAPI migration
 * 2026_06_18_init_pet_avatar_defaults, which backfilled these onto existing
 * documents. Kept identical so old and new records stay consistent.
 */
const avatarSchema = new Schema<PetAvatar>(
  {
    url: { type: String, default: null },
    color: { type: String, default: '#A78BFA' },
    initials: { type: Boolean, default: true },
  },
  { _id: false }
);

const petSchema = new Schema<PetAttrs, PetModel, PetMethods>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    species: {
      type: String,
      required: [true, 'Species is required'],
      trim: true,
    },
    breed: { type: String, trim: true },
    age: { type: Number, min: [0, 'Age cannot be negative'] },
    weight: { type: Number, min: [0, 'Weight cannot be negative'] },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
      index: true,
    },
    avatar: {
      type: avatarSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    // Set explicitly rather than relying on the pluraliser: the collection name
    // is the one thing here that is expensive to change once data exists, and
    // the previous Python migration already wrote to 'pets'.
    collection: 'pets',
  }
);

petSchema.methods.toPublic = function toPublic(this: PetDoc): PublicPet {
  return {
    id: this._id.toString(),
    name: this.name,
    species: this.species,
    breed: this.breed ?? null,
    age: this.age ?? null,
    weight: this.weight ?? null,
    ownerId: this.owner.toString(),
    avatar: {
      url: this.avatar?.url ?? null,
      color: this.avatar?.color ?? '#A78BFA',
      initials: this.avatar?.initials ?? true,
    },
  };
};

export const Pet = model<PetAttrs, PetModel>('Pet', petSchema);
