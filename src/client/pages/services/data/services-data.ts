import type { ServiceItem } from '@/types/services';

export const services: ServiceItem[] = [
  {
    title: 'AI Symptom Triage',
    description:
      "Tell our AI about your pet's symptoms in plain English. It analyzes the details to give you calm, practical advice. If things look serious, it'll tell you to see a vet immediately.",
    href: '/chat',
    actionText: 'Ask the AI',
  },
  {
    title: 'Interactive Anatomy',
    description:
      "Click through 3D models of dogs, cats, and birds to see how their bodies actually work. It's an easy way to understand their health and where issues might be coming from.",
    href: '/anatomy',
    actionText: 'Explore anatomy',
  },
  {
    title: 'Personalized Nutrition',
    description:
      "Stop guessing with generic kibble. Input your pet's age, weight, and allergies to get customized meal ideas and dietary recommendations that actually fit their needs.",
    href: '/planner',
    actionText: 'Plan a meal',
  },
  {
    title: 'Find Nearby Vets',
    description:
      'When you need a professional right away, our map shows you verified, highly-rated clinics near you. You can review each vet and get directions instantly.',
    href: '/map',
    actionText: 'Find a clinic',
  },
  {
    title: 'Hire a Professional',
    description:
      'Sometimes you just need to talk to a real vet. Use our platform to connect with licensed veterinarians and book one-on-one consultations.',
    href: '/book-appointment',
    actionText: 'Book appointment',
  },
  {
    title: 'Veterinary Blogs',
    description:
      'Read straightforward articles written by veterinary professionals. We cover behavioral training, seasonal health risks, and spotlight local clinics you should know about.',
    href: '/blogs',
    actionText: 'Read articles',
  },
];
