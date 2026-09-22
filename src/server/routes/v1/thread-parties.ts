import {
  findUsersByIds,
  findVerifiedProfessionalsByUserIds,
  otherPartyOf,
  type ThreadDocument,
  type ThreadParty,
} from '../../models';

import type { ObjectId } from 'mongodb';

// A vet's licence name and photo, keyed by their account id, so a thread shows the vet, not their login.
async function vetFacesOf(userIds: string[]): Promise<Map<string, Partial<ThreadParty>>> {
  const vets = await findVerifiedProfessionalsByUserIds(userIds);
  return new Map(
    vets.map((vet) => [
      vet.user.toString(),
      { name: vet.fullName, avatarUrl: vet.avatarUrl ?? null },
    ])
  );
}

// The accounts on the far side of a page of threads, resolved in one read like the booking lists.
export async function partiesOf(
  items: ThreadDocument[],
  viewer: ObjectId
): Promise<Map<string, ThreadParty>> {
  const ids = [...new Set(items.map((item) => otherPartyOf(item, viewer)))];
  const [users, vetFaces] = await Promise.all([findUsersByIds(ids), vetFacesOf(ids)]);

  return new Map(
    users.map((user) => {
      const id = user._id.toString();
      // When the far side is a vet, their listing name and photo win over the raw account.
      const vet = vetFaces.get(id);
      return [
        id,
        {
          id,
          name: vet?.name ?? user.name ?? null,
          email: user.email,
          avatarUrl: vet?.avatarUrl ?? user.avatarUrl ?? null,
        },
      ];
    })
  );
}
