/**
 * Placeholder console data.
 *
 * Vetify has no bookings or client-messaging collection yet — `src/server/models`
 * carries pets, professionals, blogs and activity events, and `chat.service` talks
 * to the assistant rather than to another person. So the three console panels read
 * from here until those endpoints exist. Everything below is sample content; swap
 * each array for a query and the panels need no other change.
 */

export type AppointmentStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled';

export type Appointment = {
  id: string;
  clientName: string;
  clientEmail: string;
  petName: string;
  petSpecies: string;
  petBreed: string;
  date: string;
  timeSlot: string;
  type: 'Online Telehealth' | 'In-Clinic Visit';
  status: AppointmentStatus;
  notes: string;
};

export const SAMPLE_APPOINTMENTS: Appointment[] = [
  {
    id: 'BK-1049',
    clientName: 'Emily Watson',
    clientEmail: 'emily.watson@example.com',
    petName: 'Milo',
    petSpecies: 'Dog',
    petBreed: 'Golden Retriever (3 yrs)',
    date: 'Today',
    timeSlot: '02:30 PM – 03:00 PM',
    type: 'Online Telehealth',
    status: 'confirmed',
    notes: 'Skin rash inspection and diet follow-up.',
  },
  {
    id: 'BK-1050',
    clientName: 'Marcus Vance',
    clientEmail: 'marcus.v@example.com',
    petName: 'Luna',
    petSpecies: 'Cat',
    petBreed: 'Siamese (2 yrs)',
    date: 'Tomorrow',
    timeSlot: '10:00 AM – 10:30 AM',
    type: 'Online Telehealth',
    status: 'confirmed',
    notes: 'Post-surgery checkup & appetite evaluation.',
  },
  {
    id: 'BK-1051',
    clientName: 'Sophia Lin',
    clientEmail: 'sophia.l@example.com',
    petName: 'Rocky',
    petSpecies: 'Dog',
    petBreed: 'French Bulldog (4 yrs)',
    date: 'Aug 29, 2026',
    timeSlot: '04:15 PM – 04:45 PM',
    type: 'In-Clinic Visit',
    status: 'pending',
    notes: 'Vaccination booster & general health check.',
  },
  {
    id: 'BK-1045',
    clientName: 'David Miller',
    clientEmail: 'd.miller@example.com',
    petName: 'Oliver',
    petSpecies: 'Cat',
    petBreed: 'Domestic Shorthair (5 yrs)',
    date: 'Aug 25, 2026',
    timeSlot: '11:00 AM – 11:30 AM',
    type: 'Online Telehealth',
    status: 'completed',
    notes: 'Behavioral consultation regarding anxiety.',
  },
];

type Conversation = {
  id: string;
  clientName: string;
  petName: string;
  lastMessage: string;
  lastAuthor: 'client' | 'you';
  sentAt: string;
  unread: number;
  linkedAppointmentId: string | null;
};

export const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: 'CV-311',
    clientName: 'Emily Watson',
    petName: 'Milo',
    lastMessage: "I've attached a photo of the rash — it looks worse than yesterday.",
    lastAuthor: 'client',
    sentAt: '6m ago',
    unread: 2,
    linkedAppointmentId: 'BK-1049',
  },
  {
    id: 'CV-309',
    clientName: 'Marcus Vance',
    petName: 'Luna',
    lastMessage: 'Keep her on the soft food until we speak tomorrow morning.',
    lastAuthor: 'you',
    sentAt: '2h ago',
    unread: 0,
    linkedAppointmentId: 'BK-1050',
  },
  {
    id: 'CV-304',
    clientName: 'Sophia Lin',
    petName: 'Rocky',
    lastMessage: 'Does he need to fast before the booster shot?',
    lastAuthor: 'client',
    sentAt: 'Yesterday',
    unread: 1,
    linkedAppointmentId: 'BK-1051',
  },
  {
    id: 'CV-298',
    clientName: 'David Miller',
    petName: 'Oliver',
    lastMessage: 'Thank you, the anxiety plan is helping already.',
    lastAuthor: 'client',
    sentAt: 'Aug 25',
    unread: 0,
    linkedAppointmentId: 'BK-1045',
  },
];

export type HistoryKind = 'booking' | 'message' | 'reminder' | 'profile';

type HistoryEntry = {
  id: string;
  kind: HistoryKind;
  summary: string;
  detail: string | null;
  at: string;
};

export const SAMPLE_HISTORY: HistoryEntry[] = [
  {
    id: 'LOG-9012',
    kind: 'booking',
    summary: 'Appointment BK-1049 confirmed with Emily Watson',
    detail: 'Online telehealth · 02:30 PM today',
    at: '10m ago',
  },
  {
    id: 'LOG-9011',
    kind: 'message',
    summary: 'Emily Watson sent 2 messages about Milo',
    detail: 'Attachment included',
    at: '12m ago',
  },
  {
    id: 'LOG-9008',
    kind: 'reminder',
    summary: 'Reminder dispatched for consultation with Milo',
    detail: 'Sent at your configured lead time',
    at: '1h ago',
  },
  {
    id: 'LOG-8996',
    kind: 'profile',
    summary: 'Consultation rate updated',
    detail: 'Change recorded against your listing',
    at: '2 days ago',
  },
  {
    id: 'LOG-8990',
    kind: 'booking',
    summary: 'Consultation BK-1045 marked completed',
    detail: 'Patient notes recorded for Oliver',
    at: '3 days ago',
  },
];
