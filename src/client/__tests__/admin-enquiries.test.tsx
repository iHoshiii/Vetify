import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RequestTab from '../pages/admin/applications/request-tab';
import type { AdminInquiry } from '../services/admin.service';

/**
 * The decline dialog is filled with userEvent, which types a whole sentence of
 * reason one keystroke at a time and re-renders the table for each one. On its own
 * the file finishes in under two seconds; with the rest of the suite competing for
 * the same cores it crosses the five-second default, and the timeout says nothing
 * about the dialog. Raised here rather than globally, as in professionals-apply.
 */
vi.setConfig({ testTimeout: 20_000 });

const invite = {
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  isError: false,
  isSuccess: false,
  error: null,
  data: undefined as unknown,
};
const decline = { ...invite, mutate: vi.fn(), reset: vi.fn() };
const list = {
  data: undefined as unknown,
  isPending: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
};

vi.mock('@/hooks/useAdminInquiries', () => ({
  useAdminInquiries: () => list,
  useInviteInquiry: () => invite,
  useDeclineInquiry: () => decline,
}));

function inquiry(overrides: Partial<AdminInquiry> = {}): AdminInquiry {
  return {
    id: 'i1',
    name: 'Marites Reyes',
    email: 'marites@clinic.ph',
    licenseNumber: 'VET 1234-PH',
    currentLocation: 'Cebu City, Cebu',
    clinicLocation: 'Mandaue, Cebu',
    motivation: 'Fifteen years of small animal practice and nowhere to write any of it down.',
    phone: '+63 32 555 0101',
    yearsExperience: 15,
    status: 'pending',
    inviteNote: null,
    invitedAt: null,
    inviteExpiresAt: null,
    inviteLive: false,
    inviteCount: 0,
    declineReason: null,
    reviewedBy: null,
    reviewedAt: null,
    completedAt: null,
    applicationId: null,
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T00:00:00.000Z',
    ...overrides,
  };
}

function page(items: AdminInquiry[]) {
  return { items, page: 1, limit: 20, total: items.length, pages: 1 };
}

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RequestTab />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  list.data = page([inquiry()]);
  invite.isSuccess = false;
  invite.isError = false;
  invite.data = undefined;
  decline.isSuccess = false;
  decline.isError = false;
});

describe('the enquiries tab', () => {
  it('shows who wrote in, and opens the enquiry itself in a panel', async () => {
    const user = userEvent.setup();
    renderTab();

    expect(screen.getByText('Marites Reyes')).toBeInTheDocument();
    expect(screen.getByText('marites@clinic.ph')).toBeInTheDocument();
    expect(screen.getByText('Waiting on you')).toBeInTheDocument();

    // The motivation is the basis for the decision, so it is one click away rather
    // than filling the row. Nothing of it is on the page until it is asked for.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Read the enquiry' }));

    const panel = screen.getByRole('dialog');
    expect(within(panel).getByText(/Fifteen years of small animal practice/)).toBeInTheDocument();
    expect(within(panel).getByText('VET 1234-PH')).toBeInTheDocument();
  });

  it('puts the queue back when the panel is closed', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Read the enquiry' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invite' })).toBeInTheDocument();
  });

  it('asks before inviting, and does not demand a note', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Invite' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Invite marites@clinic.ph\?/)).toBeInTheDocument();
    // An approval owes nobody a paragraph.
    expect(within(dialog).getByText('(optional)')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Invite' }));

    expect(invite.mutate).toHaveBeenCalledTimes(1);
    expect(invite.mutate.mock.calls[0][0]).toEqual({ id: 'i1' });
  });

  it('shows the minted link once, and says that is the only time', () => {
    invite.isSuccess = true;
    invite.data = {
      inquiry: inquiry({ status: 'invited', inviteLive: true, inviteCount: 1 }),
      link: 'https://vetify.test/professionals/apply/abc123',
      delivered: true,
      deliveryError: null,
    };

    renderTab();

    expect(screen.getByText('Link emailed to marites@clinic.ph.')).toBeInTheDocument();
    expect(screen.getByText('https://vetify.test/professionals/apply/abc123')).toBeInTheDocument();
    expect(screen.getByText(/only time the link is readable/)).toBeInTheDocument();
  });

  it('says when the email did not go, and still shows the link', () => {
    invite.isSuccess = true;
    invite.data = {
      inquiry: inquiry({ status: 'invited', inviteLive: true }),
      link: 'https://vetify.test/professionals/apply/abc123',
      delivered: false,
      deliveryError: 'The mail provider refused the message (503)',
    };

    renderTab();

    // The decision stands either way, so the reviewer is told and handed the link.
    expect(screen.getByText(/did not go out: The mail provider refused/)).toBeInTheDocument();
    expect(screen.getByText('https://vetify.test/professionals/apply/abc123')).toBeInTheDocument();
  });

  it('calls a second invitation a resend', async () => {
    const user = userEvent.setup();
    list.data = page([
      inquiry({
        status: 'invited',
        inviteLive: true,
        inviteCount: 1,
        inviteExpiresAt: '2026-09-08T00:00:00.000Z',
      }),
    ]);

    renderTab();

    expect(screen.getByText('Link live')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resend' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Resend the link to marites@clinic.ph?');
  });

  it('marks an invitation that ran out of time', () => {
    list.data = page([
      inquiry({
        status: 'invited',
        inviteLive: false,
        inviteCount: 2,
        inviteExpiresAt: '2026-08-20T00:00:00.000Z',
      }),
    ]);

    renderTab();

    expect(screen.getByText('Link expired')).toBeInTheDocument();
    expect(screen.getByText('Sent 2 times')).toBeInTheDocument();
  });

  it('demands a reason to reject, and sends it', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Reject' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('(required)')).toBeInTheDocument();

    await user.type(
      within(dialog).getByRole('textbox'),
      'The licence number is not on the board register.'
    );
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));

    expect(decline.mutate).toHaveBeenCalledTimes(1);
    expect(decline.mutate.mock.calls[0][0]).toEqual({
      id: 'i1',
      reason: 'The licence number is not on the board register.',
    });
  });

  it('offers nothing to decide on an enquiry that is already settled', () => {
    list.data = page([
      inquiry({ status: 'completed', completedAt: '2026-08-26T00:00:00.000Z' }),
      inquiry({
        id: 'i2',
        status: 'declined',
        declineReason: 'Not on the register.',
        reviewedBy: 'admin-1',
      }),
    ]);

    renderTab();

    // Scoped to the table: the status filter has an option reading 'Declined' too —
    // that one is the stored status, which the rename deliberately left alone.
    const table = screen.getByRole('table');
    expect(within(table).getByText(/Application filed/)).toBeInTheDocument();
    // A filed enquiry is spent, not finished: the row says where the verdict is owed.
    expect(within(table).getByText(/Awaiting a verdict in Application/)).toBeInTheDocument();
    expect(within(table).getByText('Rejected')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invite' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('tells an automatic refusal from a decision somebody made', async () => {
    const user = userEvent.setup();
    list.data = page([
      inquiry({
        status: 'declined',
        declineReason: 'Automatic: no licence number was given',
        // What the screen leaves behind: a rejection with nobody against it.
        reviewedBy: null,
      }),
    ]);

    renderTab();

    const table = screen.getByRole('table');
    expect(within(table).getByText('Rejected automatically')).toBeInTheDocument();
    // The badge is all the row carries — which rule fired now lives in the panel,
    // where the rest of the enquiry went. A reviewer checking up on the automatic
    // screen has to open it to find out.
    expect(within(table).queryByText(/no licence number was given/)).not.toBeInTheDocument();

    await user.click(within(table).getByRole('button', { name: 'Read the enquiry' }));

    expect(
      within(screen.getByRole('dialog')).getByText('Automatic: no licence number was given')
    ).toBeInTheDocument();
  });
});
