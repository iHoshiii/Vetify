/**
 * Placeholder console data.
 *
 * Conversations read the API now; what is left is the activity feed nothing records.
 * Swap the array below for a query when its endpoint exists and the panel needs no
 * other change.
 */

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
