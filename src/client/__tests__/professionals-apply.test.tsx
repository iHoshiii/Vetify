import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProfessionalApplyPage from '../pages/professionals/apply-page';
import { ApiError } from '../services/api';
import type { OwnProfessional } from '../services/professionals.service';
import {
  applyAsProfessional,
  getOwnApplication,
  listProfessionals,
} from '../services/professionals.service';

vi.mock('../services/professionals.service', () => ({
  applyAsProfessional: vi.fn(),
  getOwnApplication: vi.fn(),
  listProfessionals: vi.fn(),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

function application(overrides: Partial<OwnProfessional> = {}): OwnProfessional {
  return {
    id: 'a1',
    userId: 'u1',
    licenseNumber: 'VET 1234-PH',
    licenseAuthority: 'Professional Regulation Commission',
    credentialUrls: ['https://example.com/licence.pdf'],
    specialties: ['dentistry'],
    clinicName: 'Bayside Animal Clinic',
    clinicAddress: '12 Mabini Street, Cebu City',
    bio: 'Long enough to pass the minimum the form asks for.',
    yearsExperience: 15,
    status: 'pending',
    rejectionReason: null,
    reviewedAt: null,
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-08-20T09:00:00.000Z',
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/professionals/apply']}>
        <ProfessionalApplyPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** Fills every required field with something the shared schema accepts. */
async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('License number'), 'VET 1234-PH');
  await user.type(screen.getByLabelText('Issuing authority'), 'Professional Regulation Commission');
  await user.type(screen.getByLabelText('Clinic name'), 'Bayside Animal Clinic');
  await user.type(screen.getByLabelText('Years in practice'), '15');
  await user.type(screen.getByLabelText('Clinic address'), '12 Mabini Street, Cebu City');
  await user.type(
    screen.getByLabelText('Credential links, one per line'),
    'https://example.com/licence.pdf'
  );
  await user.type(
    screen.getByLabelText('How you introduce yourself to pet owners'),
    'Small animal practice for fifteen years, mostly dentistry and soft tissue surgery work.'
  );
}

beforeEach(() => {
  vi.mocked(getOwnApplication).mockReset();
  vi.mocked(applyAsProfessional).mockReset();
  vi.mocked(listProfessionals).mockReset();
});

describe('the apply page', () => {
  it('shows the form to someone who has not applied', async () => {
    vi.mocked(getOwnApplication).mockRejectedValue(
      new ApiError(404, 'You have not applied yet.', 'no-application')
    );

    renderPage();

    expect(await screen.findByLabelText('License number')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit application' })).toBeInTheDocument();
  });

  it('shows where an application stands instead of a second form', async () => {
    vi.mocked(getOwnApplication).mockResolvedValue(application());

    renderPage();

    expect(await screen.findByText('Under review')).toBeInTheDocument();
    expect(screen.getByText('VET 1234-PH')).toBeInTheDocument();
    // Filing twice is refused by a unique index; offering the form here would
    // only walk somebody into that 409.
    expect(screen.queryByLabelText('License number')).not.toBeInTheDocument();
  });

  it('gives the reason back when an application was turned down', async () => {
    vi.mocked(getOwnApplication).mockResolvedValue(
      application({
        status: 'rejected',
        rejectionReason: 'The license number does not match the board register.',
        reviewedAt: '2026-08-22T09:00:00.000Z',
      })
    );

    renderPage();

    expect(await screen.findByText('Not approved')).toBeInTheDocument();
    expect(
      screen.getByText('The license number does not match the board register.')
    ).toBeInTheDocument();
  });
});

describe('the application form', () => {
  beforeEach(() => {
    vi.mocked(getOwnApplication).mockRejectedValue(
      new ApiError(404, 'You have not applied yet.', 'no-application')
    );
  });

  it('refuses to send an application with no consent given', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('License number');

    // Everything filled but the box left unchecked, so consent is the only thing
    // left to fail on.
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Submit application' }));

    expect(
      await screen.findByText('Consent to a background check is required')
    ).toBeInTheDocument();
    // Validated by the same schema the route uses, so the round trip is not spent
    // learning what the client already knew.
    expect(applyAsProfessional).not.toHaveBeenCalled();
  });

  it('sends a complete application and switches to the status view', async () => {
    const user = userEvent.setup();
    vi.mocked(applyAsProfessional).mockResolvedValue(application());

    renderPage();
    await screen.findByLabelText('License number');

    await fillForm(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => expect(applyAsProfessional).toHaveBeenCalledTimes(1));
    expect(vi.mocked(applyAsProfessional).mock.calls[0][0]).toMatchObject({
      credentialUrls: ['https://example.com/licence.pdf'],
      backgroundCheckConsent: true,
      yearsExperience: '15',
    });
    // The reply seeds the cache this page reads, so the pending screen appears
    // without a second request.
    expect(await screen.findByText('Under review')).toBeInTheDocument();
  });

  it('puts a server-side field error on the field it belongs to', async () => {
    const user = userEvent.setup();
    vi.mocked(applyAsProfessional).mockRejectedValue(
      new ApiError(400, 'Validation failed', undefined, {
        licenseNumber: ['That license number is already registered'],
      })
    );

    renderPage();
    await screen.findByLabelText('License number');

    await fillForm(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Submit application' }));

    expect(
      await screen.findByText('That license number is already registered')
    ).toBeInTheDocument();
  });
});
