import { formatDistance, type MapVet, type OsmClinic } from '../map-prof-vet';
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** How the three availability values read to somebody who is not a vet. */
const AVAILABILITY_WORDS: Record<string, string> = {
  available: 'Taking bookings',
  busy: 'Booked up at the moment',
  unavailable: 'Not taking bookings',
};

const EXTERNAL_LINK_ICON =
  '<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>';

/** A clinic scraped from OpenStreetMap: what the tags said, and a way out to Maps. */
export function clinicPopupHtml(clinic: OsmClinic): string {
  const line = (text: string) =>
    `<p style="margin:4px 0 0;color:#64748b;font-size:12px;">${text}</p>`;

  const details = [
    clinic.address ? line(escapeHtml(clinic.address)) : '',
    clinic.phone ? line(`📞 ${escapeHtml(clinic.phone)}`) : '',
    clinic.openingHours ? line(`🕐 ${escapeHtml(clinic.openingHours)}`) : '',
  ].join('');

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${clinic.latitude},${clinic.longitude}`;

  return `<div style="font-family:system-ui,sans-serif;min-width:180px;padding-bottom:4px;">
              <p style="font-weight:700;font-size:14px;margin:0;color:#1e293b;">${escapeHtml(
                clinic.name
              )}</p>
              ${details}
              <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
                <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:600;">🐾 Vet Clinic</p>
                <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="font-size:11px;font-weight:700;color:#2563eb;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
                  Open in Maps
                  ${EXTERNAL_LINK_ICON}
                </a>
              </div>
            </div>`;
}
export function vetPopupHtml(vet: MapVet): string {
  const heading = escapeHtml(vet.clinicName ?? vet.name);
  const subheading = vet.clinicName ? escapeHtml(vet.name) : null;

  const rows = [
    subheading
      ? `<p style="margin:2px 0 0;color:#475569;font-size:12px;font-weight:600;">${subheading}</p>`
      : '',
    `<p style="margin:6px 0 0;color:#64748b;font-size:12px;">${escapeHtml(vet.addressLine)}</p>`,
    vet.specialties.length
      ? `<p style="margin:6px 0 0;color:#0f766e;font-size:11px;font-weight:700;">${escapeHtml(
          vet.specialties.slice(0, 3).join(' · ')
        )}</p>`
      : '',
    `<p style="margin:6px 0 0;color:#64748b;font-size:12px;">₱${vet.hourlyRate} an hour · ${
      AVAILABILITY_WORDS[vet.availabilityStatus] ?? 'Taking bookings'
    }</p>`,
    vet.distanceMeters === undefined
      ? ''
      : `<p style="margin:6px 0 0;color:#0f766e;font-size:12px;font-weight:700;">${formatDistance(
          vet.distanceMeters
        )} away</p>`,
  ].join('');

  const link = (href: string, label: string, primary: boolean) =>
    `<a href="${href}" data-spa style="font-size:11px;font-weight:700;text-decoration:none;padding:6px 10px;border-radius:8px;${
      primary
        ? 'background:#0f766e;color:#ffffff;'
        : 'background:#f1f5f9;color:#0f766e;border:1px solid #cbd5e1;'
    }">${label}</a>`;

  return `<div style="font-family:system-ui,sans-serif;min-width:200px;padding-bottom:4px;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#0f766e;">✓ Verified on Vetify</p>
              <p style="font-weight:700;font-size:14px;margin:0;color:#1e293b;">${heading}</p>
              ${rows}
              <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:6px;">
                ${link(`/book-appointment?professional=${vet.id}`, 'Book', true)}
                ${link(`/professionals/${vet.id}`, 'Profile', false)}
              </div>
            </div>`;
}
export function interceptLinks(
  root: HTMLElement | null | undefined,
  navigate?: (path: string) => void
): void {
  if (!root || !navigate) return;

  root.querySelectorAll<HTMLAnchorElement>('a[data-spa]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      navigate(anchor.getAttribute('href') ?? '');
    });
  });
}
