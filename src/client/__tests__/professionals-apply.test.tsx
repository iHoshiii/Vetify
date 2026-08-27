import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProfessionalApplyPage from '../pages/professionals/apply-page';
import { ApiError } from '../services/api';
import type { OwnProfessional } from '../services/professionals.service';
import {
  getOwnApplication,
  listProfessionals,
  sendProfessionalInquiry,
} from '../services/professionals.service';

/**
 * The enquiry form is filled with userEvent, which types every character of a
 * motivation paragraph one keystroke at a time. That crosses the five-second
 * default once the rest of the suite is competing for the same cores — a timeout
 * that says nothing about the form. Raised here rather than globally.
 */
vi.setConfig({ testTimeout: 20_000 });

vi.mock('../services/professionals.service', () => ({
  getOwnApplication: vi.fn(),
  listProfessionals: vi.fn(),
  sendProfessionalInquiry: vi.fn(),
  fetchCapture: vi.fn(),
}));

const auth: { isAuthenticated: boolean; user: { email: string } | null } = {
  isAuthenticated: true,
  user: null,
};

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => auth,
}));

function application(overrides: Partial<OwnProfessional> = {}): OwnProfessional {
  return {
    id: 'a1',
    userId: 'u1',
    fullName: 'Marites Reyes',
    licenseNumber: 'VET 1234-PH',
    licenseAuthority: 'Professional Regulation Commission',
    credentialUrls: ['https://example.com/licence.pdf'],
    specialties: ['dentistry'],
    clinicName: 'Bayside Animal Clinic',
    clinicAddress: '12 Mabini Street, Cebu City',
    addresses: [
      {
        kind: 'clinic',
        line1: '12 Mabini Street',
        city: 'Cebu City',
        province: 'Cebu',
        postalCode: '6000',
        fix: null,
      },
    ],
    businessPhone: '+63 32 555 0101',
    bio: 'Long enough to pass the minimum the form asks for.',
    yearsExperience: 15,
    status: 'pending',
    captures: {},
    interviewAt: null,
    interviewNote: null,
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

/** Fills the short form with something the shared schema accepts. */
async function fillEnquiry(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Your name'), 'Marites Reyes');
  await user.type(screen.getByLabelText('Email address'), 'marites@clinic.ph');
  await user.type(screen.getByLabelText('License number'), 'VET 1234-PH');
  await user.type(screen.getByLabelText('Where you are based'), 'Cebu City, Cebu');
  await user.type(
    screen.getByLabelText('Why do you want to join our team?'),
    'Fifteen years of small animal practice and nowhere to write any of it down.'
  );
}

beforeEach(() => {
  auth.isAuthenticated = true;
  auth.user = null;
  vi.mocked(getOwnApplication).mockReset();
  vi.mocked(sendProfessionalInquiry).mockReset();
  vi.mocked(listProfessionals).mockReset();
});

describe('the apply page', () => {
  it('shows the enquiry form to someone who has not applied', async () => {
    vi.mocked(getOwnApplication).mockRejectedValue(
      new ApiError(404, 'You have not applied yet.', 'no-application')
    );

    renderPage();

    expect(await screen.findByLabelText('Why do you want to join our team?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send enquiry' })).toBeInTheDocument();
    // The long form is not here. It is behind a link a reviewer sends.
    expect(screen.queryByText('Photographs, taken now')).not.toBeInTheDocument();
  });

  it('never asks for an application without a session to ask with', () => {
    // RequireAuth keeps this page from rendering anonymously in the first place;
    // the hook's own guard is what makes it harmless if it ever does.
    auth.isAuthenticated = false;

    renderPage();

    expect(getOwnApplication).not.toHaveBeenCalled();
  });

  it('starts the enquiry with the address the invitation would go to', async () => {
    auth.user = { email: 'marites@clinic.ph' };
    vi.mocked(getOwnApplication).mockRejectedValue(
      new ApiError(404, 'You have not applied yet.', 'no-application')
    );

    renderPage();

    expect(await screen.findByLabelText('Email address')).toHaveValue('marites@clinic.ph');
  });

  it('shows where an application stands instead of a form', async () => {
    vi.mocked(getOwnApplication).mockResolvedValue(application());

    renderPage();

    expect(await screen.findByText('Under review')).toBeInTheDocument();
    expect(screen.getByText('VET 1234-PH')).toBeInTheDocument();
    expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument();
  });

  it('says none of it can be edited here', async () => {
    vi.mocked(getOwnApplication).mockResolvedValue(application());

    renderPage();

    expect(await screen.findByText('Something above is wrong?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', '/contact');
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

  it('puts the booked interview on the page once there is one', async () => {
    vi.mocked(getOwnApplication).mockResolvedValue(
      application({
        status: 'interview',
        interviewAt: '2026-09-10T06:30:00.000Z',
        interviewNote: 'Bring the original licence card.',
      })
    );

    renderPage();

    expect(await screen.findByText('Interview booked')).toBeInTheDocument();
    expect(screen.getByText(/^Interview: /)).toBeInTheDocument();
    expect(screen.getByText('Bring the original licence card.')).toBeInTheDocument();
  });
});

describe('the enquiry form', () => {
  beforeEach(() => {
    vi.mocked(getOwnApplication).mockRejectedValue(
      new ApiError(404, 'You have not applied yet.', 'no-application')
    );
  });

  it('refuses an answer too short for a reviewer to act on', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Your name');

    await user.type(screen.getByLabelText('Your name'), 'Marites Reyes');
    await user.type(screen.getByLabelText('Email address'), 'marites@clinic.ph');
    await user.type(screen.getByLabelText('License number'), 'VET 1234-PH');
    await user.type(screen.getByLabelText('Where you are based'), 'Cebu City, Cebu');
    await user.type(screen.getByLabelText('Why do you want to join our team?'), 'i want in');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByText(/at least 40 characters/i)).toBeInTheDocument();
    // Validated by the same schema the route uses, so the round trip is not spent
    // learning what the client already knew.
    expect(sendProfessionalInquiry).not.toHaveBeenCalled();
  });

  it('sends the enquiry and says what happens next', async () => {
    const user = userEvent.setup();
    vi.mocked(sendProfessionalInquiry).mockResolvedValue({ received: true });

    renderPage();
    await screen.findByLabelText('Your name');

    await fillEnquiry(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    await waitFor(() => expect(sendProfessionalInquiry).toHaveBeenCalledTimes(1));
    expect(vi.mocked(sendProfessionalInquiry).mock.calls[0][0]).toMatchObject({
      email: 'marites@clinic.ph',
      currentLocation: 'Cebu City, Cebu',
    });

    // The next thing that happens is an email, so the screen says so rather than
    // pretending there is a queue position to watch.
    expect(await screen.findByText('Thank you — that is with us.')).toBeInTheDocument();
    expect(screen.getByText('marites@clinic.ph')).toBeInTheDocument();
  });

  it('says so when the address already has an enquiry open', async () => {
    const user = userEvent.setup();
    vi.mocked(sendProfessionalInquiry).mockRejectedValue(
      new ApiError(
        409,
        'We already have an enquiry from that address. Watch your inbox — we will be in touch.',
        'inquiry-open'
      )
    );

    renderPage();
    await screen.findByLabelText('Your name');

    await fillEnquiry(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(
      await screen.findByText(/already have an enquiry from that address/)
    ).toBeInTheDocument();
  });

  it('puts a server-side field error on the field it belongs to', async () => {
    const user = userEvent.setup();
    vi.mocked(sendProfessionalInquiry).mockRejectedValue(
      new ApiError(400, 'Invalid request payload.', undefined, {
        licenseNumber: ['That license number is not one we recognise'],
      })
    );

    renderPage();
    await screen.findByLabelText('Your name');

    await fillEnquiry(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(
      await screen.findByText('That license number is not one we recognise')
    ).toBeInTheDocument();
  });
});
