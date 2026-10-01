import type { PetInput, Pet } from '@shared/pets';
import { ageFromBirthMonth, petAge } from '@shared/pet-age';
import { ObjectId, type Collection, type IndexDescription } from 'mongodb';

import { getDb } from '../config/db';

export const PETS_COLLECTION = 'pets';
export const PET_INDEXES: IndexDescription[] = [{ key: { ownerId: 1, createdAt: 1 } }];

type PetDocument = Omit<PetInput, 'ageYears' | 'ageMonths'> & {
  _id: ObjectId;
  ownerId: ObjectId;
  ageYearsAtReference: number;
  ageMonthsAtReference: number;
  registeredOn: string;
  ageReferenceOn: string;
  createdAt: Date;
  updatedAt: Date;
};

function collection(): Collection<PetDocument> {
  return getDb().collection<PetDocument>(PETS_COLLECTION);
}

function view(doc: PetDocument): Pet {
  const { _id, ownerId: _ownerId, createdAt, updatedAt, ...fields } = doc;
  return {
    ...fields,
    id: _id.toHexString(),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export async function listPets(ownerId: ObjectId): Promise<Pet[]> {
  const docs = await collection().find({ ownerId }).sort({ createdAt: 1 }).toArray();
  return docs.map(view);
}

export async function createPet(
  ownerId: ObjectId,
  input: PetInput,
  registeredOn: string
): Promise<Pet> {
  const now = new Date();
  const { ageYears, ageMonths, ...fields } = input;
  const initialAge = input.birthMonth
    ? ageFromBirthMonth(input.birthMonth, registeredOn)
    : { years: ageYears, months: ageMonths };
  const doc: PetDocument = {
    ...fields,
    ageYearsAtReference: initialAge.years,
    ageMonthsAtReference: initialAge.months,
    _id: new ObjectId(),
    ownerId,
    registeredOn,
    ageReferenceOn: registeredOn,
    createdAt: now,
    updatedAt: now,
  };
  await collection().insertOne(doc);
  return view(doc);
}

export async function updatePet(
  ownerId: ObjectId,
  id: ObjectId,
  input: PetInput,
  today: string
): Promise<Pet | null> {
  const previous = await collection().findOne({ _id: id, ownerId });
  if (!previous) return null;
  const { ageYears, ageMonths, ...fields } = input;
  const currentAge = petAge(previous, today);
  const corrected =
    previous.birthMonth !== input.birthMonth ||
    currentAge.years !== ageYears ||
    currentAge.months !== ageMonths;
  const nextAge = input.birthMonth
    ? ageFromBirthMonth(input.birthMonth, today)
    : { years: ageYears, months: ageMonths };
  const doc = await collection().findOneAndUpdate(
    { _id: id, ownerId },
    {
      $set: {
        ...fields,
        ageYearsAtReference: corrected ? nextAge.years : previous.ageYearsAtReference,
        ageMonthsAtReference: corrected ? nextAge.months : previous.ageMonthsAtReference,
        ageReferenceOn: corrected ? today : previous.ageReferenceOn,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
  return doc ? view(doc) : null;
}
