import { PET_AVATAR_DEFAULTS } from './constants';
import { PetDocument, PublicPet } from './types';

// transforms petDocument to PublicPet for client-side consumption
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
