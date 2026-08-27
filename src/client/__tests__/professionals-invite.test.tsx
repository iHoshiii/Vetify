import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProfessionalInvitePage from '../pages/professionals/invite-page';
import { ApiError } from '../services/api';
import type { InviteSummary, OwnProfessional } from '../services/professionals.service';
import {
  applyThroughInvite,
  getInvite,
  getOwnApplication,
} from '../services/professionals.service';

vi.setConfig({ testTimeout: 20_000 });

vi.mock('../services/professionals.service', () => ({
  applyThroughInvite: vi.fn(),
  getInvite: vi.fn(),
  getOwnApplication: vi.fn(),
  fetchCapture: vi.fn(),
}));

const auth: { isAuthenticated: boolean; user: { email: string } | null } = {
  isAuthenticated: true,
  user: { email: 'marites@clinic.ph' },
};

vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => auth }));

const TOKEN = 'a'.repeat(64);

function invite(overrides: Partial<InviteSummary> = {}): InviteSummary {
  return {
    name: 'Marites Reyes',
    email: 'marites@clinic.ph',
    licenseNumber: 'VET 1234-PH',
    currentLocation: 'Cebu City, Cebu',
    clinicLocation: 'Mandaue, Cebu',
    expiresAt: '2026-09-10T00:00:00.000Z',
    ...overrides,
  };
}

function application(overrides: Partial<OwnProfessional> = {}): OwnProfessional {
  return {
    id: 'a1',
    userId: 'u1',
    fullName: 'Marites Reyes',
    licenseNumber: 'VET 1234-PH',
    licenseAuthority: 'Professional Regulation Commission',
    credentialUrls: [],
    specialties: ['dentistry'],
    clinicName: 'Bayside Animal Clinic',
    clinicAddress: '12 Mabini Street, Cebu City',
    addresses: [],
    businessPhone: null,
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
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/professionals/apply/${TOKEN}`]}>
        <Routes>
          <Route path="/professionals/apply/:token" element={<ProfessionalInvitePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  auth.isAuthenticated = true;
  auth.user = { email: 'marites@clinic.ph' };
  vi.mocked(getInvite).mockReset();
  vi.mocked(getOwnApplication).mockReset();
  vi.mocked(applyThroughInvite).mockReset();
  vi.mocked(getOwnApplication).mockRejectedValue(
    new ApiError(404, 'You have not applied yet.', 'no-application')
  );
});

describe('the invited application page', () => {
  it('shows the form with the three fields a reviewer already approved', async () => {
    vi.mocked(getInvite).mockResolvedValue(invite());

    renderPage();

    expect(await screen.findByText('From your enquiry')).toBeInTheDocument();
    expect(screen.getByText('Marites Reyes')).toBeInTheDocument();
    expect(screen.getByText('VET 1234-PH')).toBeInTheDocument();
    // Shown, not editable: changing the name here would mean the application was
    // never the one anybody agreed to invite.
    expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('License number')).not.toBeInTheDocument();

    expect(screen.getByText('Photographs, taken now')).toBeInTheDocument();
    // Three cameras and no file input anywhere on the page.
    expect(screen.getAllByRole('button', { name: 'Open camera' })).toHaveLength(3);
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('names the address to sign in with, rather than bouncing an anonymous reader', async () => {
    auth.isAuthenticated = false;
    auth.user = null;
    vi.mocked(getInvite).mockResolvedValue(invite());

    renderPage();

    expect(await screen.findByText('Sign in to continue')).toBeInTheDocument();
    expect(screen.getAllByText('marites@clinic.ph').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText('Photographs, taken now')).not.toBeInTheDocument();
  });

  it('tells the wrong account that the link belongs to another address', async () => {
    auth.user = { email: 'someone.else@example.com' };
    vi.mocked(getInvite).mockResolvedValue(invite());

    renderPage();

    expect(await screen.findByText('This link is for another address')).toBeInTheDocument();
    expect(screen.queryByText('Photographs, taken now')).not.toBeInTheDocument();
  });

  it('offers another link when this one expired', async () => {
    vi.mocked(getInvite).mockRejectedValue(
      new ApiError(410, 'That link has expired. Ask us for a new one.', 'expired')
    );

    renderPage();

    expect(await screen.findByText('That link has expired')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', '/contact');
  });

  it('points a spent link at the application it already filed', async () => {
    vi.mocked(getInvite).mockRejectedValue(
      new ApiError(410, 'That link has already been used.', 'used')
    );

    renderPage();

    expect(await screen.findByText('That link has already been used')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See your application' })).toHaveAttribute(
      'href',
      '/professionals/apply'
    );
  });

  it('suggests checking the address when the link was never ours', async () => {
    vi.mocked(getInvite).mockRejectedValue(
      new ApiError(404, 'That application link is not one of ours.', 'not-found')
    );

    renderPage();

    expect(await screen.findByText('That link is not one of ours')).toBeInTheDocument();
  });

  it('shows the status instead of a second form once the application is in', async () => {
    vi.mocked(getInvite).mockResolvedValue(invite());
    vi.mocked(getOwnApplication).mockResolvedValue(application());

    renderPage();

    expect(await screen.findByText('Under review')).toBeInTheDocument();
    expect(screen.queryByText('Photographs, taken now')).not.toBeInTheDocument();
  });

  it('will not submit without the photographs, and does not spend a round trip finding out', async () => {
    const user = userEvent.setup();
    vi.mocked(getInvite).mockResolvedValue(invite());

    renderPage();
    await screen.findByText('From your enquiry');

    // Everything the browser itself insists on, so the only things left missing are
    // the three photographs and the location fix — the two the schema decides.
    await user.type(screen.getByLabelText('Years in practice'), '15');
    await user.type(
      screen.getByLabelText('How you introduce yourself to pet owners'),
      'Small animal practice for fifteen years, mostly dentistry and soft tissue surgery work.'
    );
    await user.type(screen.getByLabelText('Street and number'), '12 Mabini Street');
    await user.type(screen.getByLabelText('City or municipality'), 'Cebu City');
    await user.type(screen.getByLabelText('Province'), 'Cebu');
    await user.click(screen.getByRole('checkbox'));

    await user.click(screen.getByRole('button', { name: 'Submit application' }));

    expect(await screen.findByText('Please correct the highlighted fields.')).toBeInTheDocument();
    expect(applyThroughInvite).not.toHaveBeenCalled();
  });
});
