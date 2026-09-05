export {
  appointmentsCollection,
  countAppointmentsByStatus,
  findAppointmentById,
  findAppointments,
  findHeldSlots,
  holdsSlotFor,
  insertAppointment,
  isDuplicateSlot,
  tallyAppointments,
  updateAppointment,
  type AppointmentPatch,
  type AppointmentTally,
  type FindAppointmentsOptions,
} from './repository';

export { appointmentAttrsSchema, type AppointmentAttrs } from './schema';

export { otherPartyId, toAppointmentPage, toAppointmentView } from './transform';

export {
  APPOINTMENT_INDEXES,
  APPOINTMENT_LIVE_STATUSES,
  APPOINTMENT_STATUSES,
  APPOINTMENTS_COLLECTION,
  type AppointmentDocument,
  type AppointmentKind,
  type AppointmentPage,
  type AppointmentParty,
  type AppointmentStatus,
  type AppointmentView,
} from './types';
