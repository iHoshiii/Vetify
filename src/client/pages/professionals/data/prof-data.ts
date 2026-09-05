import type { ConditionItem, EligibilityItem } from '@/types/professional';

export const eligibility: EligibilityItem[] = [
  {
    icon: '🎓',
    title: 'Valid Veterinary License',
    body: 'You must hold a current, valid license to practice veterinary medicine issued by a recognized regulatory body in your country or region.',
  },
  {
    icon: '📋',
    title: 'Proof of Credentials',
    body: 'The application asks for a photograph of your face and PRC licence, front and back to verify your identity and credentials.',
  },
  {
    icon: '🏥',
    title: 'Active Practice',
    body: 'You must be actively practicing veterinary medicine, either in a clinic, hospital, or as an independent practitioner.',
  },
  {
    icon: '💬',
    title: 'Communication Skills',
    body: 'Professionals must be able to communicate clearly in English and the primary language of the pet owners they serve.',
  },
  {
    icon: '📱',
    title: 'Technology Access',
    body: 'A reliable internet connection and a device capable of video consultation is required to deliver services through the platform.',
  },
  {
    icon: '✅',
    title: 'Background Check',
    body: 'All applicants must consent to and pass a professional background verification before being listed on the Vetify platform.',
  },
];

export const conditions: ConditionItem[] = [
  {
    num: '01',
    title: 'Code of Conduct',
    body: "All professionals must adhere to Vetify's code of conduct, which requires respectful, evidence-based, and ethical communication with pet owners at all times.",
  },
  {
    num: '02',
    title: 'Response Time',
    body: 'Professionals are expected to respond to consultation requests within 24 hours. Consistent non-response may result in suspension of your profile.',
  },
  {
    num: '03',
    title: 'Scope of Advice',
    body: 'Guidance provided through Vetify is advisory in nature. Professionals must clearly communicate when an in-person visit is necessary and avoid making definitive diagnoses without proper examination.',
  },
  {
    num: '04',
    title: 'Privacy & Confidentiality',
    body: 'All information shared by pet owners during consultations is confidential. Professionals must not share, store, or use this data outside the Vetify platform.',
  },
  {
    num: '05',
    title: 'Platform Fees',
    body: "Vetify retains a service fee from each paid consultation. The current fee structure will be provided during onboarding and is subject to change with 30 days' notice.",
  },
  {
    num: '06',
    title: 'Termination',
    body: "Vetify reserves the right to suspend or permanently remove any professional who violates the platform's terms, receives consistent negative feedback, or engages in misconduct.",
  },
];
