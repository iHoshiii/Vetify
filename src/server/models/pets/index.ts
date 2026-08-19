// public surface of the pets module: everything outside imports from here rather
// than reaching into the files below, so the split stays an internal detail.
export { PETS_COLLECTION, PET_AVATAR_DEFAULTS, PET_INDEXES } from './constants';
export {
  deletePet,
  findPetById,
  findPetByOwnerAndName,
  findPetsByOwner,
  insertPet,
  petsCollection,
  updatePet,
} from './repository';
export { petAttrsSchema, type PetAttrs } from './schema';
export { toPublicPet } from './transform';
export type { PetAvatar, PetDocument, PublicPet } from './types';
