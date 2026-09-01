import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ApplicationQueue, { type Phase } from '../pages/admin/applications/application-queue';
import type { AdminProfessional } from '../services/admin.service';

const review = {
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  isError: false,
  isSuccess: false,
  error: null,
  data: undefined as unknown,
};
const interview = { ...review, mutate: vi.fn(), reset: vi.fn() };
const list = {
  data: undefined as unknown,
  isPending: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
};

/** What the queue asked the server for, which is the phase's whole contract. */
const asked: { params: unknown } = { params: undefined };

vi.mock('@/hooks/useAdminProfessionals', () => ({
  useAdminProfessionals: (params: unknown) => {
    asked.params = params;
    return list;
  },
  useReviewProfessional: () => review,
  useScheduleInterview: () => interview,
}));

function application(overrides: Partial<AdminProfessional> = {}): AdminProfessional {
  return {
    id: 'a1',
    userId: 'u1',
    fullName: 'Marites Reyes',
    licenseNumber: 'VET 1234-PH',
    licenseAuthority: 'PRC',
    credentialUrls: ['https://example.test/diploma.pdf'],
    specialties: ['surgery'],
    clinicName: 'Mandaue Animal Clinic',
    clinicAddress: '9 Rizal Avenue, Cebu City',
    addresses: [],
    businessPhone: null,
    bio: 'Fifteen years of small animal practice.',
    yearsExperience: 15,
    hourlyRate: 60,
    availabilityStatus: 'available',
    weeklySchedule: [],
    avatarUrl: null,
    workHistory: [],
    bookingNotificationMinutes: 30,
    flaggedForRateReview: false,
    status: 'pending',
    captures: {},
    interviewAt: null,
    interviewNote: null,
    rejectionReason: null,
    reviewedAt: null,
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T00:00:00.000Z',
    applicant: {
      id: 'u1',
      email: 'marites@clinic.ph',
      name: 'Marites Reyes',
      role: 'user',
      status: 'active',
    },
    reviewedBy: null,
    ...overrides,
  };
}

function page(items: AdminProfessional[]) {
  return { items, page: 1, limit: 20, total: items.length, pages: 1 };
}

function renderQueue(phase: Phase) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ApplicationQueue phase={phase} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  asked.params = undefined;
  list.data = page([application()]);
  review.isSuccess = false;
  review.isError = false;
  interview.isSuccess = false;
  interview.isError = false;
});

describe('the application phase', () => {
  it('opens on both statuses that owe a verdict', () => {
    renderQueue('application');

    // Not 'pending' alone: an application at interview is no less waiting on a
    // decision, and a default that hid it would leave a booked applicant unread.
    expect(asked.params).toMatchObject({ status: ['pending', 'interview'] });
  });

  it('asks for the same word the enquiry queue does', () => {
    renderQueue('application');

    const table = screen.getByRole('table');
    // 'Accept', not 'Verify': the stored status is still 'verified' and the route is
    // still /verify — only the label follows the pipeline's vocabulary.
    expect(within(table).getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument();
  });
});

describe('the outcome tabs', () => {
  it('opens Accepted on the directory, and offers to pull a listing', () => {
    list.data = page([application({ status: 'verified', reviewedAt: '2026-08-27T00:00:00.000Z' })]);
    renderQueue('accepted');

    expect(asked.params).toMatchObject({ status: ['verified'] });
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeInTheDocument();
  });

  it('hears an appeal from the tab that shows the refusal', () => {
    list.data = page([
      application({ status: 'rejected', rejectionReason: 'Not on the register.' }),
    ]);
    renderQueue('rejected');

    expect(asked.params).toMatchObject({ status: ['rejected'] });
    expect(screen.getByText('Not on the register.')).toBeInTheDocument();
    // Both halves of an appeal: give it a hearing, or accept it outright.
    expect(screen.getByRole('button', { name: 'Interview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
  });
});

describe('the completed archive', () => {
  it('asks for every ending in one read', () => {
    renderQueue('completed');

    expect(asked.params).toMatchObject({ status: ['verified', 'rejected', 'suspended'] });
  });

  it('records what was decided and when, and offers no way to change it', () => {
    list.data = page([
      application({ status: 'verified', reviewedAt: '2026-08-27T00:00:00.000Z' }),
      application({
        id: 'a2',
        status: 'rejected',
        rejectionReason: 'Not on the register.',
        reviewedAt: '2026-08-28T00:00:00.000Z',
      }),
    ]);

    renderQueue('completed');

    const table = screen.getByRole('table');
    expect(within(table).getByText('27 Aug 2026')).toBeInTheDocument();
    expect(within(table).getByText('28 Aug 2026')).toBeInTheDocument();

    // The column is absent rather than empty. The same rows are actionable under
    // Accepted and Rejected; an archive that could also change what it records would
    // be two screens fighting over one row.
    expect(within(table).queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Interview' })).not.toBeInTheDocument();
    expect(screen.queryByText('Decision')).not.toBeInTheDocument();
  });
});
