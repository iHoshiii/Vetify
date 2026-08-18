import { ObjectId, type Collection, type IndexDescription } from 'mongodb';
import { z } from 'zod';

import { getDb } from '../config/db';
import { isValidObjectId, toObjectId } from './object-id';

export const PETS_COLLECTION = 'pets';

export type PetAvatar = {
  url: string | null;
  color: string;
  initials: boolean;
};

export type PetDocument = {
  _id: ObjectId;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  weight: number | null;
  owner: ObjectId;
  avatar: PetAvatar;
  createdAt: Date;
  updatedAt: Date;
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

/**
 * Defaults carried over from the FastAPI migration
 * 2026_06_18_init_pet_avatar_defaults, which backfilled these onto existing
 * documents. Kept identical so old and new records stay consistent.
 */
export const PET_AVATAR_DEFAULTS: PetAvatar = {
  url: null,
  color: '#A78BFA',
  initials: true,
};

export const petAttrsSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  species: z.string().trim().min(1, 'Species is required'),
  breed: z.string().trim().min(1).nullish(),
  age: z.number().min(0, 'Age cannot be negative').nullish(),
  weight: z.number().min(0, 'Weight cannot be negative').nullish(),
  owner: z.custom<string | ObjectId>(isValidObjectId, 'Owner is required'),
  avatar: z
    .object({
      url: z.string().min(1).nullish(),
      color: z.string().trim().min(1),
      initials: z.boolean(),
    })
    .partial()
    .optional(),
});

export type PetAttrs = z.input<typeof petAttrsSchema>;

export const PET_INDEXES: IndexDescription[] = [{ key: { owner: 1 } }];

export function petsCollection(): Collection<PetDocument> {
  return getDb().collection<PetDocument>(PETS_COLLECTION);
}

export async function insertPet(attrs: PetAttrs): Promise<PetDocument> {
  const parsed = petAttrsSchema.parse(attrs);
  const now = new Date();

  const doc: PetDocument = {
    _id: new ObjectId(),
    name: parsed.name,
    species: parsed.species,
    breed: parsed.breed ?? null,
    age: parsed.age ?? null,
    weight: parsed.weight ?? null,
    owner: toObjectId(parsed.owner),
    avatar: { ...PET_AVATAR_DEFAULTS, ...parsed.avatar },
    createdAt: now,
    updatedAt: now,
  };

  await petsCollection().insertOne(doc);
  return doc;
}

export function toPublicPet(pet: PetDocument): PublicPet {
  return {
    id: pet._id.toString(),
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? null,
    age: pet.age ?? null,
    weight: pet.weight ?? null,
    ownerId: pet.owner.toString(),
    avatar: {
      url: pet.avatar?.url ?? PET_AVATAR_DEFAULTS.url,
      color: pet.avatar?.color ?? PET_AVATAR_DEFAULTS.color,
      initials: pet.avatar?.initials ?? PET_AVATAR_DEFAULTS.initials,
    },
  };
}
