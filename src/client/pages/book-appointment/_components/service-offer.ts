import type { PublicProfessional } from '@/services/professionals.service';
import type { AppointmentKind } from '@shared/schemas';

// A vet offers a kind by having registered the place it happens: a clinic address for
// an onsite visit, a home location for an online consultation. Registering both offers both.
export function offersKind(vet: PublicProfessional, kind: AppointmentKind): boolean {
  const needed = kind === 'onsite' ? 'clinic' : 'home';
  return vet.addresses.some((address) => address.kind === needed);
}
