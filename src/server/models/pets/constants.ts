import { IndexDescription } from 'mongodb';
import { PetAvatar } from './types';

export const PETS_COLLECTION = 'pets';

// pet profile (picture, bg color, initials) defaults
export const PET_AVATAR_DEFAULTS: PetAvatar = {
  url: null,
  color: '#A78BFA',
  initials: true,
};

export const PET_INDEXES: IndexDescription[] = [{ key: { owner: 1 } }];
