import type { ServiceItem } from '@/types/services';

export const services: ServiceItem[] = [
  {
    title: 'AI Symptom Triage',
    description:
      "Tell our AI about your pet's symptoms in plain English. It analyzes the details to give you calm, practical advice. If things look serious, it'll tell you to see a vet immediately.",
    icon: '🤖',
    bg: 'from-teal-500 to-teal-700',
    shadow: 'shadow-teal-500/30',
    href: '/chat',
    actionText: 'Ask the AI',
  },
  {
    title: 'Interactive Anatomy',
    description:
      "Click through 3D models of dogs, cats, and birds to see how their bodies actually work. It's an easy way to understand their health and where issues might be coming from.",
    icon: '🦴',
    bg: 'from-indigo-500 to-indigo-700',
    shadow: 'shadow-indigo-500/30',
    href: '/anatomy',
    actionText: 'Explore anatomy',
  },
  {
    title: 'Personalized Nutrition',
    description:
      "Stop guessing with generic kibble. Input your pet's age, weight, and allergies to get customized meal ideas and dietary recommendations that actually fit their needs.",
    icon: '🥗',
    bg: 'from-blue-500 to-blue-700',
    shadow: 'shadow-blue-500/30',
    href: '/planner',
    actionText: 'Plan a meal',
  },
  {
    title: 'Find Nearby Vets',
    description:
      'When you need a professional right away, our map shows you verified, highly-rated clinics near you. You can check their specialties and get directions instantly.',
    icon: '📍',
    bg: 'from-orange-400 to-orange-600',
    shadow: 'shadow-orange-500/30',
    href: '/map',
    actionText: 'Find a clinic',
  },
  {
    title: 'Hire a Professional',
    description:
      'Sometimes you just need to talk to a real vet. Use our platform to connect with licensed veterinarians and book one-on-one consultations.',
    icon: '👩‍⚕️',
    bg: 'from-pink-500 to-rose-600',
    shadow: 'shadow-pink-500/30',
    href: '/book-appointment',
    actionText: 'Book appointment',
  },
  {
    title: 'Veterinary Blogs',
    description:
      'Read straightforward articles written by veterinary professionals. We cover behavioral training, seasonal health risks, and spotlight local clinics you should know about.',
    icon: '📝',
    bg: 'from-amber-400 to-amber-600',
    shadow: 'shadow-amber-500/30',
    href: '/blogs',
    actionText: 'Read articles',
  },
];
