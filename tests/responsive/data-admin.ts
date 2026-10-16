import { account, DATE, OTHER_ID, VET_ID, vet } from './data';
export const report = {
  id: VET_ID,
  appointmentId: VET_ID,
  professionalId: VET_ID,
  reporterId: OTHER_ID,
  reason: 'Reported abusive review content.',
  status: 'pending',
  stars: 2,
  comment: 'Review with several lines of content. '.repeat(5),
  reviewer: 'Owner Name',
  reporter: vet.name,
  decidedAt: null,
  createdAt: DATE,
};
export const audit = {
  id: VET_ID,
  actor: OTHER_ID,
  actorEmail: account.email,
  action: 'user.role.changed',
  targetType: 'user',
  targetId: OTHER_ID,
  reason: 'Reviewed account role.',
  metadata: { roleFrom: 'user', roleTo: 'professional' },
  ip: '127.0.0.1',
  createdAt: DATE,
};
