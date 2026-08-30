import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { NearbyPlace, OsmClinic } from '../components/map-vets';
import NearestVets, { type NearestVetsProps } from '../pages/map/_components/nearest-vets';
import type { NearbyProfessional } from '../services/professionals.service';

/**
 * The panel that makes "Find a vet near you." mean it.
 *
 * As much of this is about the refusals as about the list. Asking for a location opens a
 * browser prompt, and most of the answers to a prompt are not "yes" — so every state has
 * a sentence and a way onward, and the way onward is the directory, which answers the
 * same question by city and needs no permission at all. A panel that goes blank after a
 * denied prompt is worse than no button.
 *
 * The rows come from two sources and are asserted to read differently, because they are
 * different claims: a Vetify vet is verified and bookable, and an OpenStreetMap clinic is
 * a name on a public map with directions and nothing else. The merging itself is
 * `rankNearby`'s job and is tested in `map-vets.test.ts`; this file is about what the
 * panel says.
 */

function nearby(overrides: Partial<NearbyProfessional> = {}): NearbyProfessional {
  return {
    id: 'a1',
    userId: 'u1',
    name: 'Marites Reyes',
    avatarUrl: null,
    clinicName: 'Bayside Animal Clinic',
    clinicAddress: '12 Mabini Street, Cebu City',
    addresses: [],
    businessPhone: null,
    specialties: ['dentistry'],
    bio: 'A bio.',
    yearsExperience: 15,
    hourlyRate: 425,
    availabilityStatus: 'available',
    weeklySchedule: [],
    workHistory: [],
    verifiedAt: '2026-08-20T09:00:00.000Z',
    distanceMeters: 1234,
    ...overrides,
  };
}

function clinic(overrides: Partial<OsmClinic> = {}): OsmClinic {
  return {
    id: 'node/1',
    name: 'Solano Pet Care',
    latitude: 16.52,
    longitude: 121.18,
    address: '5 Burgos Street, Solano',
    ...overrides,
  };
}

/** The two branches of the union, so a test can say what it means in one line. */
function ours(vet: NearbyProfessional): NearbyPlace {
  return { source: 'vetify', key: `vetify:${vet.id}`, distanceMeters: vet.distanceMeters, vet };
}

function theirs(from: OsmClinic, distanceMeters: number): NearbyPlace {
  return { source: 'osm', key: `osm:${from.id}`, distanceMeters, clinic: from };
}

function renderPanel(props: Partial<NearestVetsProps> = {}) {
  const onAsk = vi.fn();

  render(
    <MemoryRouter>
      <NearestVets
        status="idle"
        onAsk={onAsk}
        places={[]}
        loading={false}
        vetsFailed={false}
        clinicsFailed={false}
        {...props}
      />
    </MemoryRouter>
  );

  return { onAsk };
}

describe('before a location has been shared', () => {
  it('offers the directory beside the button, for somebody who would rather not', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: /use my location/i })).toBeEnabled();
    expect(screen.getByRole('link', { name: /browse the directory/i })).toHaveAttribute(
      'href',
      '/professionals'
    );
  });

  it('leaves the asking to the page above it', async () => {
    const { onAsk } = renderPanel();

    await userEvent.click(screen.getByRole('button', { name: /use my location/i }));

    expect(onAsk).toHaveBeenCalledTimes(1);
  });
});

describe('the ranked list', () => {
  it('writes a distance the way a person would say it', () => {
    renderPanel({
      status: 'ready',
      places: [
        ours(nearby({ distanceMeters: 1234 })),
        ours(nearby({ id: 'a2', name: 'Ramon Cruz', distanceMeters: 8600 })),
      ],
    });

    expect(screen.getByText('1.2 km away')).toBeInTheDocument();
    expect(screen.getByText('8.6 km away')).toBeInTheDocument();
  });

  it('keeps the order the server ranked them in', () => {
    renderPanel({
      status: 'ready',
      places: [
        ours(nearby({ id: 'a2', name: 'Ramon Cruz', distanceMeters: 420 })),
        ours(nearby({ distanceMeters: 1234 })),
      ],
    });

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Ramon Cruz');
    expect(rows[1]).toHaveTextContent('Marites Reyes');
  });

  it('offers a booking link only to a vet who is taking bookings', () => {
    renderPanel({
      status: 'ready',
      places: [
        ours(nearby()),
        ours(nearby({ id: 'a2', name: 'Ramon Cruz', availabilityStatus: 'busy' })),
      ],
    });

    expect(screen.getByRole('link', { name: /book with marites/i })).toHaveAttribute(
      'href',
      '/book-appointment?professional=a1'
    );
    expect(screen.queryByRole('link', { name: /book with ramon/i })).toBeNull();
    expect(screen.getByText('Booked up')).toBeInTheDocument();
  });
});

describe('the answers that are not a list', () => {
  it('has something useful to say when the prompt is refused', () => {
    renderPanel({ status: 'denied' });

    expect(screen.getByText(/keeping your location private/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /search the directory/i })).toHaveAttribute(
      'href',
      '/professionals'
    );
    // The button stays: allowing the site and pressing it again is the way back.
    expect(screen.getByRole('button', { name: /use my location/i })).toBeEnabled();
  });

  it('drops the button entirely where a browser cannot share a location', () => {
    renderPanel({ status: 'unsupported' });

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(/cannot share a location/i)).toBeInTheDocument();
  });

  it('separates a device that could not get a fix from a prompt that was refused', () => {
    renderPanel({ status: 'failed' });

    expect(screen.getByText(/could not get a fix/i)).toBeInTheDocument();
  });

  it('shows the lookup as well as the prompt', () => {
    renderPanel({ status: 'ready', loading: true });

    // Labelled Update rather than Locating, because the browser has already answered —
    // it is the directory being read now, not the device.
    expect(screen.getByRole('button', { name: /update/i })).toBeDisabled();
    expect(screen.getByText(/looking for vets near you/i)).toBeInTheDocument();
  });

  it('admits it when the lookup fails', () => {
    renderPanel({ status: 'ready', vetsFailed: true, clinicsFailed: true });

    expect(screen.getByText(/could not reach the directory or OpenStreetMap/i)).toBeInTheDocument();
  });

  it('names the radius when there is nothing inside it', () => {
    renderPanel({ status: 'ready', places: [], radiusKm: 25 });

    expect(screen.getByText(/within 25 km of you/i)).toBeInTheDocument();
    // And says why that is not the same as there being nothing there, for either source.
    expect(screen.getByText(/choose whether to appear/i)).toBeInTheDocument();
    expect(screen.getByText(/only knows the clinics somebody has added/i)).toBeInTheDocument();
  });

  it('says which half is missing when only one source is down', () => {
    renderPanel({ status: 'ready', clinicsFailed: true, places: [ours(nearby())] });

    // The rows still render: one source down is a short list, not no answer.
    expect(screen.getByText('Marites Reyes')).toBeInTheDocument();
    expect(screen.getByText(/OpenStreetMap could not be reached/i)).toBeInTheDocument();
    expect(screen.queryByText(/could not reach the directory or OpenStreetMap/i)).toBeNull();
  });
});

describe('a clinic that is not ours', () => {
  it('offers directions and no booking, and says whose listing it is', () => {
    renderPanel({ status: 'ready', places: [theirs(clinic(), 620)] });

    expect(screen.getByText('Solano Pet Care')).toBeInTheDocument();
    expect(screen.getByText('620 m away')).toBeInTheDocument();
    expect(screen.getByText(/listed on openstreetmap/i)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /open in maps/i })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=16.52,121.18'
    );
    // Nothing to book and no profile to open: we have never checked this place.
    expect(screen.queryByRole('link', { name: /book with/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /solano pet care/i })).toBeNull();
  });

  it('shows a phone number when OpenStreetMap has one', () => {
    renderPanel({ status: 'ready', places: [theirs(clinic({ phone: '+63 917 000 1234' }), 620)] });

    expect(screen.getByRole('link', { name: /917 000 1234/ })).toHaveAttribute(
      'href',
      'tel:+63 917 000 1234'
    );
  });

  it('mixes both sources in the order it was given', () => {
    renderPanel({
      status: 'ready',
      places: [
        theirs(clinic(), 300),
        ours(nearby({ distanceMeters: 1234 })),
        theirs(clinic({ id: 'way/9', name: 'Bambang Vet' }), 4100),
      ],
    });

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Solano Pet Care');
    expect(rows[1]).toHaveTextContent('Marites Reyes');
    expect(rows[2]).toHaveTextContent('Bambang Vet');
  });
});
