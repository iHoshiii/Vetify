import type { PublicProfessional } from '@/services/professionals.service';
import type { AppointmentKind } from '@shared/schemas';

// Onsite needs somewhere to visit, so it is offered only by a vet with a clinic address.
// Virtual needs nothing but a verified vet, and every vet in these lists is one.
export function offersKind(vet: PublicProfessional, kind: AppointmentKind): boolean {
  if (kind === 'virtual') return true;
  return vet.addresses.some((address) => address.kind === 'clinic');
}

// What a vet who does not do the chosen kind does do instead, for the "only offers" line.
export function onlyOffersLabel(vet: PublicProfessional): string {
  return offersKind(vet, 'onsite') ? 'clinic visits' : 'online consultations';
}
