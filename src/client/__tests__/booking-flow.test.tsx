import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  BOOKING_CLINIC_RADIUS_KM,
  BOOKING_NEAREST_LIMIT,
  PROFESSIONAL_NEAR_RADIUS_NATIONWIDE_KM,
} from '@shared/limits';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import BookAppointmentPage from '../pages/book-appointment/book-appointment-page';
import { ApiError } from '../services/api';
import type { NearbyProfessional, PublicProfessional } from '../services/professionals.service';

/**
 * The reason box is filled with userEvent, which types a sentence one keystroke at a
 * time and re-renders the page for each. Raised here rather than globally, as in the
 * other flows that type into a textarea.
 */
vi.setConfig({ testTimeout: 20_000 });

const request = {
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  isError: false,
  isSuccess: false,
  error: null as unknown,
  data: undefined as unknown,
};

const list = {
  data: undefined as unknown,
  isPending: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
};

const slots = {
  data: undefined as unknown,
  isPending: false,
  isError: false,
  refetch: vi.fn(),
};

const mine = { data: undefined as unknown, isPending: false };

const nearby = {
  data: undefined as unknown,
  isFetching: false,
  isError: false,
  error: null as unknown,
};

/** What the page asked the directory for, so the test can assert on the filter. */
let asked: Record<string, unknown> | undefined;

/** And what it asked the nearest-vets endpoint, which is where the radius shows up. */
let nearbyAsked: Record<string, unknown> | null;

vi.mock('@/hooks/useProfessionals', () => ({
  useProfessionals: (params: Record<string, unknown>) => {
    asked = params;
    return list;
  },
  useProfessionalSlots: () => slots,
  useNearbyProfessionals: (params: Record<string, unknown> | null) => {
    nearbyAsked = params;
    return nearby;
  },
}));

vi.mock('@/hooks/useAppointments', () => ({
  useRequestAppointment: () => request,
  useMyAppointments: () => mine,
  useCancelAppointment: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { email: 'pat@example.com' }, isAuthenticated: true }),
}));

function vet(overrides: Partial<PublicProfessional> = {}): PublicProfessional {
  return {
    id: 'p1',
    userId: 'u1',
    name: 'Marites Reyes',
    avatarUrl: null,
    clinicName: 'Bayside Animal Clinic',
    clinicAddress: '12 Mabini Street, Cebu City, Cebu',
    addresses: [
      {
        kind: 'clinic',
        line1: '12 Mabini Street',
        city: 'Cebu City',
        province: 'Cebu',
        postalCode: '6000',
        mapPin: null,
      },
    ],
    businessPhone: null,
    specialties: ['dentistry'],
    bio: 'Small animal practice.',
    yearsExperience: 15,
    hourlyRate: 60,
    availabilityStatus: 'available',
    weeklySchedule: [],
    workHistory: [],
    verifiedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

/** A directory entry with a distance on it, as `GET /professionals/near` answers. */
function near(overrides: Partial<NearbyProfessional> = {}): NearbyProfessional {
  return { ...vet(), distanceMeters: 1_200, ...overrides };
}

/** jsdom has no geolocation, so the shortlist would read as unsupported without this. */
const geolocation = {
  getCurrentPosition: vi.fn((onOk: (position: unknown) => void) =>
    onOk({ coords: { latitude: 14.6, longitude: 121.0, accuracy: 40 } })
  ),
};

beforeAll(() => {
  Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true });
});

/**
 * The grid the page draws is keyed on today in Manila, because that is the day the
 * picker opens on. A fixture pinned to a date in 2026 would hand it a day it never asks
 * for, and the slots would silently not render.
 */
const TODAY = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** 09:00 and 09:30 Manila on that day. */
const FREE = `${TODAY}T01:00:00.000Z`;
const TAKEN = `${TODAY}T01:30:00.000Z`;

function renderPage() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/book-appointment']}>
        <BookAppointmentPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** The names in the shortlist, in the order it drew them. */
function shortlist(): string[] {
  const panel = screen.getByRole('list', { name: 'Nearest vets to you' });

  return Array.from(panel.querySelectorAll('h3')).map((heading) => heading.textContent ?? '');
}

beforeEach(() => {
  asked = undefined;
  nearbyAsked = null;
  geolocation.getCurrentPosition.mockClear();
  request.mutate.mockReset();
  request.isPending = false;
  request.isError = false;
  request.isSuccess = false;
  request.error = null;
  request.data = undefined;
  list.data = { items: [vet()], page: 1, limit: 24, total: 1, pages: 1 };
  // Empty by default, so the tests about the directory are not reading two lists.
  nearby.data = { items: [], radiusKm: BOOKING_CLINIC_RADIUS_KM };
  nearby.isFetching = false;
  nearby.isError = false;
  nearby.error = null;
  slots.data = {
    minutes: 30,
    days: [
      {
        date: TODAY,
        slots: [
          { at: FREE, taken: false },
          { at: TAKEN, taken: true },
        ],
      },
    ],
  };
  mine.data = { items: [], page: 1, limit: 20, total: 0, pages: 1 };
});

describe('the booking flow', () => {
  it('asks for nothing until the kind of visit is chosen', () => {
    renderPage();

    expect(screen.getByText('What kind of appointment?')).toBeInTheDocument();
    // Step two onwards is not rendered rather than disabled: the answer to step one
    // changes who is worth showing.
    expect(screen.queryByText('Who would you like to see?')).not.toBeInTheDocument();
  });

  it('only ever asks the directory for vets who are taking bookings', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));

    // The requirement, expressed as the one filter this page never lets go of: a
    // listing nobody can book is not a choice.
    expect(asked).toMatchObject({ available: true });
  });

  it('shows the vet with what a choice turns on', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));

    expect(screen.getByRole('heading', { name: 'Marites Reyes' })).toBeInTheDocument();
    expect(screen.getByText('12 Mabini Street, Cebu City, Cebu')).toBeInTheDocument();
    expect(screen.getByText('15 years')).toBeInTheDocument();
    expect(screen.getByText('₱60/hr')).toBeInTheDocument();
    // The way out of the flow for somebody who wants to read the work history first.
    expect(screen.getByRole('link', { name: 'View profile' })).toHaveAttribute(
      'href',
      '/professionals/p1'
    );
  });

  it('will not let a taken slot be clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));
    await user.click(screen.getByRole('button', { name: 'Choose' }));

    // Disabled rather than hidden: a full day showing nothing would read as a day the
    // vet does not work, which is a different fact.
    expect(screen.getByRole('button', { name: /already taken/ })).toBeDisabled();
  });

  it('does not offer the details form until a slot is picked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));
    await user.click(screen.getByRole('button', { name: 'Choose' }));

    expect(screen.queryByLabelText('Pet name')).not.toBeInTheDocument();
  });

  it('sends the kind, the vet and the slot along with the pet', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Online consultation/ }));
    await user.click(screen.getByRole('button', { name: 'Choose' }));

    const free = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('09:00'));
    await user.click(free!);

    await user.type(screen.getByLabelText('Pet name'), 'Milo');
    await user.type(screen.getByLabelText('Species'), 'Dog');
    await user.type(screen.getByLabelText('What is it about?'), 'A rash on his back leg.');
    await user.click(screen.getByRole('button', { name: 'Request this appointment' }));

    expect(request.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalId: 'p1',
        kind: 'virtual',
        startsAt: FREE,
        petName: 'Milo',
        petSpecies: 'Dog',
      }),
      expect.anything()
    );
  });

  it('says the slot is held once the request is in', () => {
    request.isSuccess = true;
    request.data = {
      appointment: { id: 'a1' },
      mail: {
        client: { delivered: true, deliveryError: null },
        professional: { delivered: true, deliveryError: null },
      },
    };

    renderPage();

    // The question somebody has the second after clicking: whether they need to sit on
    // the page in case somebody else takes it.
    expect(screen.getByText(/held for you while they answer/)).toBeInTheDocument();
  });

  it('says which slot went when somebody else got there first', async () => {
    const user = userEvent.setup();
    // The mutation reports the race by calling onError with the reason the route sends.
    request.mutate.mockImplementation(
      (_input: unknown, handlers: { onError?: (error: unknown) => void }) => {
        handlers.onError?.(new ApiError(409, 'Somebody just took that time.', 'slot-taken'));
      }
    );

    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));
    await user.click(screen.getByRole('button', { name: 'Choose' }));

    const free = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('09:00'));
    await user.click(free!);

    await user.type(screen.getByLabelText('Pet name'), 'Milo');
    await user.type(screen.getByLabelText('Species'), 'Dog');
    await user.type(screen.getByLabelText('What is it about?'), 'A rash on his back leg.');
    await user.click(screen.getByRole('button', { name: 'Request this appointment' }));

    // A race rather than a fault, so it reads as one — and the selection is dropped so
    // the refreshed grid decides what is left.
    expect(await screen.findByText('Somebody just took that time.')).toBeInTheDocument();
  });

  it('keeps the results area clear when nothing matches the search', async () => {
    const user = userEvent.setup();
    list.data = { items: [], page: 1, limit: 24, total: 0, pages: 1 };

    renderPage();
    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));

    expect(screen.queryByText(/No vet taking bookings matches that/)).not.toBeInTheDocument();
  });

  it('does not offer a specialty filter, because every listing here is a vet', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));

    expect(screen.queryByLabelText('Specialty')).not.toBeInTheDocument();
    // The rate is in pesos, so the label says so rather than leaving it to be assumed.
    expect(screen.getByLabelText('Max rate (/hr)')).toBeInTheDocument();
  });

  it('asks for no location until somebody offers one', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));

    // A shortlist of the vets nearest you is not worth a permission prompt nobody asked
    // for, so the query stays disabled until the button is pressed.
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(nearbyAsked).toBeNull();
  });

  it('bounds the clinic shortlist to a drive and lets the online one go nationwide', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));
    await user.click(screen.getByRole('button', { name: 'Use my location' }));

    // A clinic visit is a drive somebody makes, so a clinic across the country is not an
    // answer to it.
    expect(nearbyAsked).toMatchObject({
      latitude: 14.6,
      longitude: 121.0,
      radiusKm: BOOKING_CLINIC_RADIUS_KM,
      available: true,
    });

    await user.click(screen.getByRole('tab', { name: /Visit type/ }));
    await user.click(screen.getByRole('button', { name: /Online consultation/ }));

    // A call has no distance, so the nearest is whoever is nearest — Mindanao included.
    expect(nearbyAsked).toMatchObject({ radiusKm: PROFESSIONAL_NEAR_RADIUS_NATIONWIDE_KM });
  });

  it('ranks the clinic shortlist by distance and the online one by experience', async () => {
    const user = userEvent.setup();
    list.data = { items: [], page: 1, limit: 24, total: 0, pages: 1 };
    nearby.data = {
      radiusKm: BOOKING_CLINIC_RADIUS_KM,
      items: [
        near({ id: 'close', name: 'Ana Close', yearsExperience: 3, distanceMeters: 800 }),
        near({ id: 'far', name: 'Ben Far', yearsExperience: 22, distanceMeters: 640_000 }),
      ],
    };

    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));
    await user.click(screen.getByRole('button', { name: 'Use my location' }));

    expect(shortlist()).toEqual(['Ana Close', 'Ben Far']);
    // The distance is on the card, because it is the reason the order is what it is.
    expect(screen.getByText('800 m away')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Visit type/ }));
    await user.click(screen.getByRole('button', { name: /Online consultation/ }));

    // Most experienced first for a consultation, with distance only breaking ties. The
    // location survives the trip back to tab one, so it is not asked for twice.
    expect(shortlist()).toEqual(['Ben Far', 'Ana Close']);
  });

  it('shortlists five, however many came back', async () => {
    const user = userEvent.setup();
    list.data = { items: [], page: 1, limit: 24, total: 0, pages: 1 };
    nearby.data = {
      radiusKm: BOOKING_CLINIC_RADIUS_KM,
      items: Array.from({ length: 9 }, (_, index) =>
        near({ id: `n${index}`, name: `Vet ${index}`, distanceMeters: (index + 1) * 1_000 })
      ),
    };

    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));
    await user.click(screen.getByRole('button', { name: 'Use my location' }));

    // A list read top to bottom, not a directory page: the sixth is not what was asked.
    expect(shortlist()).toHaveLength(BOOKING_NEAREST_LIMIT);
    expect(shortlist()[0]).toBe('Vet 0');
  });

  it('says why the clinic shortlist is empty rather than showing nothing', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));
    await user.click(screen.getByRole('button', { name: 'Use my location' }));

    expect(
      screen.getByText(new RegExp(`No clinic within ${BOOKING_CLINIC_RADIUS_KM} km`))
    ).toBeInTheDocument();
  });

  it('puts the search above the shortlist, so a name beats a location', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));

    // Somebody who arrived knowing the name should not scroll past five strangers.
    const search = screen.getByLabelText('Search');
    const shortlist = screen.getByText('Nearest clinics to you');

    expect(
      search.compareDocumentPosition(shortlist) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('provides a button for submitting the vet search', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));

    expect(screen.getByRole('button', { name: 'Search vets' })).toBeInTheDocument();
  });

  it('opens appointments from the top-right button', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByRole('heading', { name: 'Appointments' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Your appointments' }));
    expect(screen.getByRole('heading', { name: 'Appointments' })).toBeInTheDocument();
  });
});

describe('the booking tabs', () => {
  it('leaves the kind behind on its own tab once it is answered', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));

    // One question on screen at a time, so the answer given is on the tab instead.
    expect(screen.queryByText('What kind of appointment?')).not.toBeInTheDocument();
    expect(screen.getByText('Who would you like to see?')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Visit type/ })).toHaveTextContent('Clinic visit');
  });

  it('locks the tabs whose question cannot be asked yet', () => {
    renderPage();

    // Step three is a question about a vet nobody has chosen, so it is not offered.
    expect(screen.getByRole('tab', { name: /Visit type/ })).toBeEnabled();
    expect(screen.getByRole('tab', { name: /Vet/ })).toBeDisabled();
    expect(screen.getByRole('tab', { name: /Time/ })).toBeDisabled();
    expect(screen.getByRole('tab', { name: /Details/ })).toBeDisabled();
  });

  it('reopens an answered step from its tab without losing the answer', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));
    await user.click(screen.getByRole('tab', { name: /Visit type/ }));

    // Going back is always allowed, and the choice already made is still pressed.
    expect(screen.getByRole('button', { name: /Clinic visit/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('opens the times as soon as a vet is chosen, and the form once a time is', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));
    await user.click(screen.getByRole('button', { name: 'Choose' }));

    expect(screen.getByRole('tab', { name: /Vet/ })).toHaveTextContent('Marites Reyes');
    expect(screen.getByText(/When suits you with Marites Reyes/)).toBeInTheDocument();

    const free = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('09:00'));
    await user.click(free!);

    expect(screen.getByText('Tell them about the visit')).toBeInTheDocument();
    expect(screen.getByLabelText('Pet name')).toBeInTheDocument();
  });
});
