import type { MapVet } from '@/types/map-prof-vet';
import type { PublicProfessional } from '../../services/professionals.service';

/** Flattens professionals into one pin per pinned address. */
export function toMapVets(
  professionals: Array<PublicProfessional & { distanceMeters?: number }>
): MapVet[] {
  return professionals.flatMap((professional) =>
    professional.addresses.flatMap((address) => {
      if (!address.mapPin) return [];

      return [
        {
          id: professional.id,
          key: `${professional.id}:${address.kind}`,
          kind: address.kind,
          name: professional.name ?? professional.clinicName ?? 'A verified vet',
          clinicName: professional.clinicName,
          addressLine: [address.line1, address.city, address.province].filter(Boolean).join(', '),
          latitude: address.mapPin.latitude,
          longitude: address.mapPin.longitude,
          specialties: professional.specialties,
          hourlyRate: professional.hourlyRate,
          availabilityStatus: professional.availabilityStatus,
          ...(professional.distanceMeters === undefined
            ? {}
            : { distanceMeters: professional.distanceMeters }),
        },
      ];
    })
  );
}
