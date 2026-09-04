import type { ProfessionalAddressKind } from '@shared/schemas';

// The three fields a name is chosen from, so a list row can ask without being a pin.
type Named = { kind: ProfessionalAddressKind; name: string; clinicName: string | null };

// A home pin is a person at their own address, so it is named after the vet, not the clinic.
export function vetLabel(vet: Named): string {
  return vet.kind === 'home' ? vet.name : vet.clinicName ?? vet.name;
}

// The second line, which only exists when the first one was the clinic's name.
export function vetSubLabel(vet: Named): string | null {
  return vet.kind === 'home' || !vet.clinicName ? null : vet.name;
}
