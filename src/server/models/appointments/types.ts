import {
  APPOINTMENT_KINDS,
  APPOINTMENT_LIVE_STATUSES,
  APPOINTMENT_STATUSES,
  type AppointmentKind,
  type AppointmentStatus,
} from '@shared/schemas';
import { ObjectId, type IndexDescription } from 'mongodb';
import type { AppointmentDelivery } from './delivery-types';

export const APPOINTMENTS_COLLECTION = 'appointments';

export { APPOINTMENT_KINDS, APPOINTMENT_LIVE_STATUSES, APPOINTMENT_STATUSES };
export type { AppointmentKind, AppointmentStatus };

export type AppointmentDocument = {
  _id: ObjectId;
  revision?: number;
  requestId?: string;
  requestFingerprint?: string;
  deliveries?: AppointmentDelivery[];
  professional: ObjectId;
  professionalUser: ObjectId;
  client: ObjectId;
  kind: AppointmentKind;
  startsAt: Date;
  minutes: number;
  heldSlots: Date[];
  status: AppointmentStatus;
  holdsSlot: boolean | null;
  petName: string | null;
  petSpecies: string;
  petBreed: string | null;
  petAge: string | null;
  reason: string;
  phone: string | null;
  clientEmail: string | null;
  meetingUrl: string | null;
  refusalReason: string | null;
  cancelledBy: ObjectId | null;
  decidedAt: Date | null;
  reminderSentAt: Date | null;
  reviewPromptSentAt: Date | null;
  joinedAt: Date | null;
  consultedAt: Date | null;
  clientJoinedAt: Date | null;
  rating: number | null;
  ratingComment: string | null;
  ratedAt: Date | null;
  reviewReply: string | null;
  reviewReplyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AppointmentParty = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};
export type AppointmentView = {
  id: string;
  kind: AppointmentKind;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  minutes: number;
  petName: string | null;
  petSpecies: string;
  petBreed: string | null;
  petAge: string | null;
  reason: string;
  phone: string | null;
  meetingUrl: string | null;
  refusalReason: string | null;
  cancelledByYou: boolean;
  with: AppointmentParty | null;
  professionalId: string;
  joinedAt: string | null;
  consultedAt: string | null;
  clientJoinedAt: string | null;
  callActive: boolean;
  rating: number | null;
  ratingComment: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type AppointmentPage = {
  items: AppointmentView[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export const APPOINTMENT_INDEXES: IndexDescription[] = [
  {
    key: { client: 1, requestId: 1 },
    unique: true,
    partialFilterExpression: { requestId: { $type: 'string' } },
  },
  { key: { 'deliveries.availableAt': 1 } },
  {
    key: { professional: 1, heldSlots: 1 },
    unique: true,
    partialFilterExpression: { holdsSlot: { $type: 'bool' } },
  },
  { key: { professionalUser: 1, startsAt: -1 } },
  { key: { client: 1, startsAt: -1 } },
];
