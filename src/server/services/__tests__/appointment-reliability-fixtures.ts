import { ObjectId } from 'mongodb';
import type { WeeklyScheduleItem } from '@shared/schemas';
import {
  insertProfessional,
  insertUser,
  updateProfessional,
  updateProfessionalProfile,
} from '../../models';

export async function bookingFixture() {
  const owner = await insertUser({
    email: `owner-${new ObjectId()}@example.com`,
    password: 'pw12345678',
    name: 'Pet owner',
    emailVerified: true,
  });
  const vet = await insertUser({
    email: `vet-${new ObjectId()}@example.com`,
    password: 'pw12345678',
    name: 'Dr Vet',
    emailVerified: true,
  });
  const professional = await insertProfessional({
    user: vet._id,
    fullName: 'Dr Vet',
    licenseNumber: `PRC-${new ObjectId()}`,
    licenseAuthority: 'Professional Regulation Commission',
    clinicName: 'Animal Clinic',
    addresses: [
      {
        kind: 'clinic',
        line1: '12 Main Street',
        city: 'Cebu City',
        province: 'Cebu',
        postalCode: '6000',
        fix: null,
      },
    ],
    bio: 'Small animal practice for dogs and cats.',
    yearsExperience: 5,
    backgroundCheckConsent: true,
  });
  const startsAt = new Date(Date.now() + 14 * 86_400_000);
  startsAt.setUTCHours(1, 0, 0, 0);
  const days: WeeklyScheduleItem['day'][] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  await updateProfessionalProfile(professional._id, {
    weeklySchedule: [
      { day: days[startsAt.getUTCDay()], enabled: true, startTime: '09:00', endTime: '12:00' },
    ],
  });
  await updateProfessional(professional._id, { status: 'verified' });
  const input = {
    client: owner,
    professionalId: professional._id,
    kind: 'onsite' as const,
    startsAt,
    petName: 'Milo',
    petSpecies: 'Dog',
    reason: 'A rash that has not been settling down.',
    phone: '+639171234567',
    clientEmail: owner.email,
  };
  return { owner, vet, professional, startsAt, input };
}
