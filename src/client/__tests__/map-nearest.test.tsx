import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

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

function renderPanel(props: Partial<NearestVetsProps> = {}) {
  const onAsk = vi.fn();

  render(
    <MemoryRouter>
      <NearestVets
        status="idle"
        onAsk={onAsk}
        vets={[]}
        loading={false}
        failed={false}
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
      vets: [
        nearby({ distanceMeters: 1234 }),
        nearby({ id: 'a2', name: 'Ramon Cruz', distanceMeters: 8600 }),
      ],
    });

    expect(screen.getByText('1.2 km away')).toBeInTheDocument();
    expect(screen.getByText('8.6 km away')).toBeInTheDocument();
  });

  it('keeps the order the server ranked them in', () => {
    renderPanel({
      status: 'ready',
      vets: [
        nearby({ id: 'a2', name: 'Ramon Cruz', distanceMeters: 420 }),
        nearby({ distanceMeters: 1234 }),
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
      vets: [nearby(), nearby({ id: 'a2', name: 'Ramon Cruz', availabilityStatus: 'busy' })],
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
    renderPanel({ status: 'ready', failed: true });

    expect(screen.getByText(/could not reach the directory/i)).toBeInTheDocument();
  });

  it('names the radius when no vet is pinned inside it', () => {
    renderPanel({ status: 'ready', vets: [], radiusKm: 25 });

    expect(screen.getByText(/within 25 km of you yet/i)).toBeInTheDocument();
    // And says why that is not the same as there being no vet there.
    expect(screen.getByText(/choose\s+whether to appear on the map/i)).toBeInTheDocument();
  });
});
