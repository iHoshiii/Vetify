import type { ObjectId } from 'mongodb';
import {
  findUsersByIds,
  findVerifiedProfessionalsByUserIds,
  otherPartyId,
  toAppointmentView,
  type AppointmentDocument,
  type AppointmentParty,
} from '../../models';
import { isCallLive } from '../../realtime/hub';

export const MISSING = 'Appointment not found';

export async function partiesOf(
  items: AppointmentDocument[],
  viewer: ObjectId
): Promise<Map<string, AppointmentParty>> {
  const ids = [...new Set(items.map((item) => otherPartyId(item, viewer)))];
  const [users, vets] = await Promise.all([
    findUsersByIds(ids),
    findVerifiedProfessionalsByUserIds(ids),
  ]);
  const vetFaces = new Map(vets.map((vet) => [vet.user.toString(), vet]));

  return new Map(
    users.map((user) => {
      const id = user._id.toString();
      const vet = vetFaces.get(id);
      return [
        id,
        {
          id,
          name: vet?.fullName ?? user.name ?? null,
          email: user.email,
          avatarUrl: vet?.avatarUrl ?? user.avatarUrl ?? null,
        },
      ];
    })
  );
}

export async function viewOf(appointment: AppointmentDocument, viewer: ObjectId) {
  const parties = await partiesOf([appointment], viewer);

  return toAppointmentView({
    appointment,
    viewer,
    party: parties.get(otherPartyId(appointment, viewer)) ?? null,
    callActive: await isCallLive(appointment._id.toString()),
  });
}

export async function savedViewOf(appointment: AppointmentDocument, viewer: ObjectId) {
  try {
    return await viewOf(appointment, viewer);
  } catch (error) {
    console.error('[appointments] saved booking details could not be enriched', error);
    return toAppointmentView({ appointment, viewer, party: null, callActive: false });
  }
}
