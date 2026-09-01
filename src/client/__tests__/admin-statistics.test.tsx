import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toneOf } from '../pages/admin/_components/chart-theme';
import AdminApplicationsLayout from '../pages/admin/applications/applications-layout';
import StatisticsTab from '../pages/admin/applications/statistics-tab';

type Slice = { label: string; count: number };

function breakdown(slices: Slice[]) {
  return {
    data: { slices, total: slices.reduce((sum, slice) => sum + slice.count, 0) },
    isPending: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

const inquiries = breakdown([
  { label: 'pending', count: 4 },
  { label: 'invited', count: 3 },
]);
const applications = breakdown([
  { label: 'verified', count: 6 },
  { label: 'rejected', count: 2 },
]);
const series = {
  data: { points: [{ date: '2026-08-30', count: 2 }] },
  isPending: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
};
const providerSeries = {
  data: {
    lines: ['facebook', 'tiktok', 'local', 'google', 'total'].map((provider) => ({
      provider,
      points: [{ date: '2026-08-30', count: provider === 'total' ? 2 : 0 }],
    })),
  },
  isPending: false,
  isFetching: false,
  isError: false,
  error: null,
};
const overview = {
  data: {
    days: 30,
    generatedAt: '2026-08-31T00:00:00.000Z',
    totals: {
      users: 10,
      admins: 1,
      professionals: 6,
      pendingApplications: 4,
      blogs: 8,
      publishedBlogs: 7,
      flaggedBlogs: 1,
      moderatedBlogs: 2,
    },
    trend: {
      signups: { current: 5, previous: 2, change: 150 },
      logins: { current: 12, previous: 8, change: 50 },
      chats: { current: 3, previous: 3, change: 0 },
      blogs: { current: 4, previous: 2, change: 100 },
      applications: { current: 6, previous: 3, change: 100 },
    },
  },
  isPending: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
};

/** What the line chart was asked for, which is what the window control changes. */
const asked: { days: number | undefined } = { days: undefined };

vi.mock('@/hooks/useAdminMetrics', () => ({
  useMetricsOverview: () => overview,
  useMetricsProviderTimeseries: () => providerSeries,
  useMetricsBreakdown: (dimension: string) =>
    dimension === 'inquiryStatus' ? inquiries : applications,
  useMetricsTimeseries: (_metric: string, days: number) => {
    asked.days = days;
    return series;
  },
}));

function renderWith(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  );
}

function renderTab() {
  return renderWith(<StatisticsTab />);
}

beforeEach(() => {
  vi.clearAllMocks();
  asked.days = undefined;
});

describe('the statistics tab', () => {
  it('opens on a month and moves the line, not the splits', async () => {
    const user = userEvent.setup();
    renderTab();

    expect(asked.days).toBe(30);

    await user.click(screen.getByRole('button', { name: '7 days' }));
    expect(asked.days).toBe(7);

    // A breakdown is the shape of what exists now, so the window says nothing about
    // it — the label that carries a span is the line's alone.
    expect(screen.getByText('Signups, last 7 days')).toBeInTheDocument();
  });

  it('says which window is on, for anybody not reading the fill', async () => {
    const user = userEvent.setup();
    renderTab();

    const group = screen.getByRole('group', { name: 'Window' });
    expect(within(group).getByRole('button', { name: '30 days' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.click(within(group).getByRole('button', { name: '90 days' }));
    expect(within(group).getByRole('button', { name: '90 days' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});

describe('the chart palette', () => {
  it('gives a status the same colour wherever it lands in the order', () => {
    // The reason `toneOf` is keyed on the label: the server sorts a breakdown
    // largest-share first, so colouring by position means the day a rejection
    // overtakes a pending application the two swap colours underneath the reader.
    expect(toneOf('verified')).toBe(toneOf('verified'));
    expect(toneOf('rejected')).not.toBe(toneOf('verified'));
    expect(toneOf('pending')).not.toBe(toneOf('rejected'));
  });

  it('reads the same fact about three collections in one colour', () => {
    // 'verified', 'published' and 'active' are one state wearing three vocabularies.
    expect(toneOf('published')).toBe(toneOf('verified'));
    expect(toneOf('active')).toBe(toneOf('verified'));
    // And a refusal is a refusal on every screen.
    expect(toneOf('declined')).toBe(toneOf('rejected'));
    expect(toneOf('banned')).toBe(toneOf('rejected'));
  });

  it('is case-insensitive and stable for a name it was never taught', () => {
    expect(toneOf('Verified')).toBe(toneOf('verified'));
    expect(toneOf('google')).toBe(toneOf('google'));
    // Slot 0 means "this thing is live", so an unnamed label cannot borrow it and
    // imply a standing nobody granted.
    expect(toneOf('google')).not.toBe(toneOf('verified'));
  });
});

describe('the phase rail', () => {
  it('divides the width between its tabs instead of leaving it empty', () => {
    renderWith(<AdminApplicationsLayout />);

    const rail = screen.getByRole('navigation', { name: 'Application phases' });
    const items = within(rail).getAllByRole('listitem');
    expect(items).toHaveLength(5);

    // The complaint this fixes: content-width tabs left most of the rail empty on a
    // console-width screen. Each tab is at least as wide as its label and they share
    // whatever is left, so the strip ends where the table below it ends.
    for (const item of items) expect(item.className).toContain('sm:flex-1');
  });

  it('keeps statistics out of the application phase rail', () => {
    renderWith(<AdminApplicationsLayout />);

    const rail = screen.getByRole('navigation', { name: 'Application phases' });
    expect(within(rail).getByRole('link', { name: /^Accepted$/ })).toBeInTheDocument();
    expect(within(rail).queryByRole('link', { name: /^Statistics$/ })).not.toBeInTheDocument();
  });

  it('shows the requested platform activity metrics', () => {
    renderTab();

    const filters = screen.getByRole('group', { name: 'Platform metric' });
    for (const label of ['Signups', 'Sign-ins', 'Users', 'Posts written', 'Applications']) {
      expect(within(filters).getByRole('button', { name: label })).toBeInTheDocument();
    }
  });
});
