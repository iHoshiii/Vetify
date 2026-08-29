/**
 * Placeholder console data.
 *
 * Two panels still read from here. The bookings that used to be in this file are real
 * now, and the appointments page reads the API; what is left is the messaging Vetify
 * does not have yet — `chat.service` talks to the assistant rather than to another
 * person — and the activity feed nothing records. Swap each array for a query when its
 * endpoint exists and the panel needs no other change.
 */

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
