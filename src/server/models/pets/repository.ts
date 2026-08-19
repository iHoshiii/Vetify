import { ObjectId, type Collection } from 'mongodb';
import { getDb } from '../../config/db';
import { toObjectId } from '../object-id';
import { PETS_COLLECTION, PET_AVATAR_DEFAULTS } from './constants';
import { PetAttrs, petAttrsSchema } from './schema';
import { PetDocument } from './types';

// get the pets collection reference from the database connection
export function petsCollection(): Collection<PetDocument> {
  return getDb().collection<PetDocument>(PETS_COLLECTION);
}

// create and insert a new pet document in the database
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

// find a single pet by its MongoDB ObjectId or string ID
export async function findPetById(id: string | ObjectId): Promise<PetDocument | null> {
  return await petsCollection().findOne({ _id: toObjectId(id) });
}

// find all pets belonging to a specific owner
export async function findPetsByOwner(ownerId: string | ObjectId): Promise<PetDocument[]> {
  return await petsCollection()
    .find({ owner: toObjectId(ownerId) })
    .toArray();
}

// check if a pet with the same name already exists for a specific owner
export async function findPetByOwnerAndName(
  ownerId: string | ObjectId,
  name: string
): Promise<PetDocument | null> {
  return await petsCollection().findOne({
    owner: toObjectId(ownerId),
    name: { $regex: new RegExp(`^${name}$`, 'i') }, // Case-insensitive exact match
  });
}

// update a pet's attributes by ID
export async function updatePet(
  id: string | ObjectId,
  updates: Partial<PetAttrs>
): Promise<PetDocument | null> {
  const targetId = toObjectId(id);
  const updatedData: Partial<PetDocument> = { updatedAt: new Date() };

  if (updates.name !== undefined) updatedData.name = updates.name.trim();
  if (updates.species !== undefined) updatedData.species = updates.species.trim();
  if (updates.breed !== undefined) updatedData.breed = updates.breed ?? null;
  if (updates.age !== undefined) updatedData.age = updates.age ?? null;
  if (updates.weight !== undefined) updatedData.weight = updates.weight ?? null;
  if (updates.avatar !== undefined) {
    updatedData.avatar = { ...PET_AVATAR_DEFAULTS, ...updates.avatar };
  }

  // rwait for the update operation and return the updated document (complete details)
  return await petsCollection().findOneAndUpdate(
    { _id: targetId },
    { $set: updatedData },
    { returnDocument: 'after' }
  );
}

// delete a pet by its ID
export async function deletePet(id: string | ObjectId): Promise<boolean> {
  const result = await petsCollection().deleteOne({ _id: toObjectId(id) });
  return result.deletedCount > 0;
}
