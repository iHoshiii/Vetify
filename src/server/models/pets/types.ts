import { ObjectId } from 'mongodb';

// pet profile (picture, bg color, initials) types
export type PetAvatar = {
  url: string | null;
  color: string;
  initials: boolean;
};

// pet document/info stored in the database
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

// pet document that can be seen in the client side
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
