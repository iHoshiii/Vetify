import type { BrowserContext } from '@playwright/test';
import { pageOf, vet } from './data';

export const mapPerson = 'Dr Alexandra Catherine Reyes, Companion Animal Specialist';
export const mapClinic = 'Vetify Test Clinic and Companion Animal Care Centre';
export const mapOsm = 'Tria Veterinary Clinic and Emergency Animal Hospital';
export const mapUnavailableId = 'e'.repeat(24);

export async function installMapResults(
  context: BrowserContext,
  options: { long?: boolean; near?: 'empty' | 'failed'; clinics?: 'empty' | 'failed' } = {}
) {
  const suffix = options.long ? 'VeterinarySpecialist'.repeat(6) : '';
  const available = {
    ...vet,
    name: mapPerson + suffix,
    clinicName: mapClinic + suffix,
    hourlyRate: 999999,
    distanceMeters: 750,
  };
  const busy = {
    ...available,
    id: 'd'.repeat(24),
    name: 'Dr Longname ' + suffix,
    availabilityStatus: 'busy',
    addresses: vet.addresses.filter((address) => address.kind === 'home'),
    distanceMeters: 14999,
  };
  const unavailable = {
    ...available,
    id: mapUnavailableId,
    clinicName: 'Temporarily Unavailable Veterinary Practice ' + suffix,
    availabilityStatus: 'unavailable',
    addresses: vet.addresses.filter((address) => address.kind === 'clinic'),
    distanceMeters: 19999,
  };
  const items = [available, busy, unavailable];
  await context.route(/\/api\/v1\/professionals(?:\?.*)?$/, (route) =>
    route.fulfill({ json: { ...pageOf(), items, total: items.length, pages: 1 } })
  );
  await context.route('**/api/v1/professionals/near?**', (route) =>
    route.fulfill({
      status: options.near === 'failed' ? 400 : 200,
      json:
        options.near === 'failed'
          ? { error: 'Directory temporarily unavailable' }
          : { items: options.near === 'empty' ? [] : items, radiusKm: 25 },
    })
  );
  await context.route('**/api/v1/clinics', (route) =>
    route.fulfill({
      status: options.clinics === 'failed' ? 503 : 200,
      json:
        options.clinics === 'failed'
          ? { error: 'Clinics temporarily unavailable' }
          : {
              items:
                options.clinics === 'empty'
                  ? []
                  : [
                      {
                        id: 'osm-test-clinic',
                        name: mapOsm + suffix,
                        latitude: 16.51,
                        longitude: 121.17,
                        address:
                          '123 Ermita Street, Bonfal Proper, Bayombong, Nueva Vizcaya, 3700 ' +
                          suffix,
                        phone: options.long ? '+63912345678901234567890123456789' : '+639123456789',
                      },
                    ],
            },
    })
  );
}
