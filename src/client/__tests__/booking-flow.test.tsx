import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BookAppointmentPage from '../pages/book-appointment/book-appointment-page';
import { ApiError } from '../services/api';
import type { PublicProfessional } from '../services/professionals.service';

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

/** What step one asked the directory for, so the test can assert on the ranking. */
let asked: Record<string, unknown> | undefined;

vi.mock('@/hooks/useProfessionals', () => ({
  useProfessionals: (params: Record<string, unknown>) => {
    asked = params;
    return list;
  },
  // No `?professional=` in these tests, so the deeplink resolves to nothing.
  useProfessional: () => ({ data: undefined }),
  useProfessionalSlots: () => slots,
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
      {
        kind: 'home',
        line1: '44 Sampaguita Lane',
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
    ratingAverage: 4.6,
    ratingCount: 12,
    availabilityStatus: 'available',
    weeklySchedule: [],
    workHistory: [],
    verifiedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * The grid the page draws is keyed on today in Manila, because that is the day the
 * picker opens on. A fixture pinned to a date in 2026 would hand it a day it never asks
 * for, and the slots would silently not render.
 */
const TODAY = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** 09:00 to 12:00 Manila on that day, on an hourly grid. */
const FREE = `${TODAY}T01:00:00.000Z`;
const NEXT = `${TODAY}T02:00:00.000Z`;
const THIRD = `${TODAY}T03:00:00.000Z`;
const TAKEN = `${TODAY}T04:00:00.000Z`;

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

beforeEach(() => {
  asked = undefined;
  request.mutate.mockReset();
  request.isPending = false;
  request.isError = false;
  request.isSuccess = false;
  request.error = null;
  request.data = undefined;
  list.data = { items: [vet()], page: 1, limit: 5, total: 1, pages: 1 };
  slots.data = {
    minutes: 60,
    days: [
      {
        date: TODAY,
        slots: [
          { at: FREE, taken: false },
          { at: NEXT, taken: false },
          { at: THIRD, taken: false },
          { at: TAKEN, taken: true },
        ],
      },
    ],
  };
  mine.data = { items: [], page: 1, limit: 20, total: 0, pages: 1 };
});

describe('the booking flow', () => {
  it('asks for the vet before anything else', () => {
    renderPage();

    expect(screen.getByText('Who would you like to see?')).toBeInTheDocument();
    // The service on offer is a fact about the vet, so it cannot be asked before them.
    expect(screen.queryByText('What kind of appointment?')).not.toBeInTheDocument();
  });

  it('ranks step one by review, and only among vets taking bookings', () => {
    renderPage();

    // Rating rather than distance, so the shortlist shows the moment the page opens with
    // no location prompt — and never a vet nobody can book.
    expect(asked).toMatchObject({ available: true, sort: 'rating', limit: 5 });
  });

  it('shows the vet with what a choice turns on, review included', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Marites Reyes' })).toBeInTheDocument();
    expect(screen.getByText('12 Mabini Street, Cebu City, Cebu')).toBeInTheDocument();
    expect(screen.getByText('15 years')).toBeInTheDocument();
    expect(screen.getByText('₱60/hr')).toBeInTheDocument();
    // The score is the reason this vet is on the list, so it is on the card.
    expect(screen.getByLabelText(/Rated 4.6 out of 5 from 12 reviews/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View profile' })).toHaveAttribute(
      'href',
      '/professionals/p1'
    );
  });

  it('offers the map as the way to every vet the shortlist leaves out', () => {
    renderPage();

    expect(screen.getByRole('link', { name: 'View map' })).toHaveAttribute('href', '/map');
  });

  it('shows no stars for a vet who has no reviews yet', () => {
    list.data = {
      items: [vet({ ratingAverage: 0, ratingCount: 0 })],
      page: 1,
      limit: 5,
      total: 1,
      pages: 1,
    };

    renderPage();

    expect(screen.queryByLabelText(/Rated/)).not.toBeInTheDocument();
  });

  it('says why step one is empty rather than showing nothing', () => {
    list.data = { items: [], page: 1, limit: 5, total: 0, pages: 1 };

    renderPage();

    expect(screen.getByText(/No reviewed vets yet/)).toBeInTheDocument();
  });

  it('will not let a taken slot be clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Choose' }));
    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));

    // Disabled rather than hidden: a full day showing nothing would read as a day the
    // vet does not work, which is a different fact.
    expect(screen.getByRole('button', { name: /already taken/ })).toBeDisabled();
  });

  it('does not offer the details form until a slot is picked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Choose' }));
    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));

    expect(screen.queryByLabelText('Pet name (optional)')).not.toBeInTheDocument();
  });

  it('sends the kind, the vet and the slot along with the pet', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Choose' }));
    await user.click(screen.getByRole('button', { name: /Online consultation/ }));

    const free = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('09:00'));
    await user.click(free!);
    await user.click(screen.getByRole('button', { name: 'Choose time' }));

    await user.type(screen.getByLabelText('Pet name (optional)'), 'Milo');
    await user.type(screen.getByLabelText('Species'), 'Dog');
    await user.type(screen.getByLabelText('What is it about?'), 'A rash on his back leg.');
    await user.click(screen.getByRole('button', { name: 'Request this appointment' }));

    expect(request.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalId: 'p1',
        kind: 'virtual',
        startsAt: FREE,
        // One hour by default: the second slot was never clicked.
        slots: 1,
        petName: 'Milo',
        petSpecies: 'Dog',
      }),
      expect.anything()
    );
  });

  it('books as many consecutive hours as are chosen in a row', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Choose' }));
    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));

    const grid = screen.getAllByRole('button');
    // Three free hours in a row, each tap adding the next: a three-hour visit, no cap at two.
    await user.click(grid.find((button) => button.textContent?.includes('09:00'))!);
    await user.click(grid.find((button) => button.textContent?.includes('10:00'))!);
    await user.click(grid.find((button) => button.textContent?.includes('11:00'))!);
    await user.click(screen.getByRole('button', { name: 'Choose time' }));

    await user.type(screen.getByLabelText('Species'), 'Dog');
    await user.type(screen.getByLabelText('What is it about?'), 'A rash on his back leg.');
    await user.click(screen.getByRole('button', { name: 'Request this appointment' }));

    expect(request.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ startsAt: FREE, slots: 3 }),
      expect.anything()
    );
  });

  it('holds the details form back until the time is chosen', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Choose' }));
    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));

    const free = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('09:00'));
    await user.click(free!);

    // A tapped slot is a draft, not a booking: the form waits for "Choose time".
    expect(screen.queryByLabelText('Pet name (optional)')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Choose time' }));
    expect(screen.getByLabelText('Pet name (optional)')).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: 'Choose' }));
    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));

    const free = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('09:00'));
    await user.click(free!);
    await user.click(screen.getByRole('button', { name: 'Choose time' }));

    await user.type(screen.getByLabelText('Pet name (optional)'), 'Milo');
    await user.type(screen.getByLabelText('Species'), 'Dog');
    await user.type(screen.getByLabelText('What is it about?'), 'A rash on his back leg.');
    await user.click(screen.getByRole('button', { name: 'Request this appointment' }));

    // A race rather than a fault, so it reads as one — and the selection is dropped so
    // the refreshed grid decides what is left.
    expect(await screen.findByText('Somebody just took that time.')).toBeInTheDocument();
  });

  it('opens appointments from the top-right button', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByRole('heading', { name: 'Your appointments' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Your appointments' }));
    expect(screen.getByRole('heading', { name: 'Your appointments' })).toBeInTheDocument();
  });
});

describe('the booking modal', () => {
  it('does not open the service step until a vet is chosen', () => {
    renderPage();

    // Choosing the vet is step one, so nothing past it is on screen to begin with.
    expect(screen.queryByText('What kind of appointment?')).not.toBeInTheDocument();
  });

  it('trades the vet list for the service step once a vet is chosen', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Choose' }));

    // One question on screen at a time: the list gives way to what that choice unlocks.
    expect(screen.queryByText('Who would you like to see?')).not.toBeInTheDocument();
    expect(screen.getByText('What kind of appointment?')).toBeInTheDocument();
  });

  it('returns to the vet list from Close with the choice still made', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Choose' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    // Going back is always allowed, and the vet already picked is still marked chosen.
    expect(screen.getByText('Who would you like to see?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chosen' })).toBeInTheDocument();
  });

  it('opens the times once a service is chosen, and the form once a time is', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Choose' }));
    await user.click(screen.getByRole('button', { name: /Clinic visit/ }));

    expect(screen.getByText(/When suits you with Marites Reyes/)).toBeInTheDocument();

    const free = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('09:00'));
    await user.click(free!);
    await user.click(screen.getByRole('button', { name: 'Choose time' }));

    expect(screen.getByText('Tell them about the visit')).toBeInTheDocument();
    expect(screen.getByLabelText('Pet name (optional)')).toBeInTheDocument();
  });
});

describe('the service step, gated to what the vet registered', () => {
  const CLINIC = {
    kind: 'clinic' as const,
    line1: '12 Mabini Street',
    city: 'Cebu City',
    province: 'Cebu',
    postalCode: '6000',
    mapPin: null,
  };
  const HOME = { ...CLINIC, kind: 'home' as const, line1: '44 Sampaguita Lane' };

  it('offers both services when the vet registered a clinic and a location', async () => {
    const user = userEvent.setup();
    list.data = {
      items: [vet({ addresses: [CLINIC, HOME] })],
      page: 1,
      limit: 5,
      total: 1,
      pages: 1,
    };

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Choose' }));

    expect(screen.getByRole('button', { name: /Clinic visit/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Online consultation/ })).toBeInTheDocument();
    expect(screen.queryByText(/only offers/)).not.toBeInTheDocument();
  });

  it('offers clinic visits only when the vet registered a clinic and no location', async () => {
    const user = userEvent.setup();
    list.data = { items: [vet({ addresses: [CLINIC] })], page: 1, limit: 5, total: 1, pages: 1 };

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Choose' }));

    expect(screen.getByRole('button', { name: /Clinic visit/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Online consultation/ })).not.toBeInTheDocument();
    expect(screen.getByText(/only offers clinic visits/)).toBeInTheDocument();
  });

  it('offers online consultations only when the vet registered a location and no clinic', async () => {
    const user = userEvent.setup();
    list.data = { items: [vet({ addresses: [HOME] })], page: 1, limit: 5, total: 1, pages: 1 };

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Choose' }));

    expect(screen.getByRole('button', { name: /Online consultation/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clinic visit/ })).not.toBeInTheDocument();
    expect(screen.getByText(/only offers online consultations/)).toBeInTheDocument();
  });
});

describe('the view-all-vets popup', () => {
  it('is closed until the button asks for it', () => {
    renderPage();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists every bookable vet A-Z, twenty a page', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /View all vet prof/ }));

    // Bookable only, alphabetical, and a page of twenty — the whole directory on demand.
    expect(asked).toMatchObject({ available: true, sort: 'name', page: 1, limit: 20 });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('searches by name or clinic from inside the popup', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /View all vet prof/ }));
    const dialog = within(screen.getByRole('dialog'));

    expect(dialog.getByPlaceholderText('Search by name or clinic')).toBeInTheDocument();
  });

  it('picks a vet from the popup and closes it', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /View all vet prof/ }));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Choose' }));

    // Choosing here is the same pick as the shortlist, so the popup closes onto the service step.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('What kind of appointment?')).toBeInTheDocument();
  });
});
