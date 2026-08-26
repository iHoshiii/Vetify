import { MODERATION_REASON_MIN } from '@shared/limits';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BreakdownChart } from '../pages/admin/_components/breakdown-chart';
import { ConfirmDialog } from '../pages/admin/_components/confirm-dialog';
import { DataTable, type Column } from '../pages/admin/_components/data-table';
import { MetricChart } from '../pages/admin/_components/metric-chart';
import { ModerationNote } from '../pages/admin/_components/moderation-note';
import { StatCard } from '../pages/admin/_components/stat-card';

/**
 * Recharts measures its container to lay itself out, and jsdom reports every
 * element as zero by zero — so the SVG never draws here. That is why every one of
 * these wrappers carries its numbers as text as well, and why these tests assert
 * the text: it is the half a screen reader gets too.
 */

const POINTS = [
  { date: '2026-08-20', count: 3 },
  { date: '2026-08-21', count: 0 },
  { date: '2026-08-22', count: 7 },
];

describe('StatCard', () => {
  it('labels the value and reads the trend as a direction and a share', () => {
    render(
      <StatCard label="Signups" value={1234} trend={{ current: 12, previous: 8, change: 50 }} />
    );

    expect(screen.getByText('Signups')).toBeInTheDocument();
    // Grouped, because a dashboard number is read at a glance.
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText(/\+50%/)).toBeInTheDocument();
    expect(screen.getByText(/vs 8 before/)).toBeInTheDocument();
  });

  it('says there is nothing to compare against instead of claiming a rise', () => {
    render(<StatCard label="Chats" value={4} trend={{ current: 4, previous: 0, change: null }} />);

    expect(screen.getByText(/no earlier activity to compare/i)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});

describe('MetricChart', () => {
  it('totals the window and describes the peak for a screen reader', () => {
    render(<MetricChart label="Signups" points={POINTS} />);

    expect(screen.getByText('10 total')).toBeInTheDocument();
    expect(
      screen.getByText(/10 in total across 3 days, most on Aug 22 with 7/)
    ).toBeInTheDocument();
  });

  it('says the window is empty rather than drawing a flat line', () => {
    render(<MetricChart label="Chats" points={[{ date: '2026-08-20', count: 0 }]} />);

    // Twice over: the visible line, and the sr-only summary above it.
    expect(screen.getByText('Nothing recorded in this window.')).toBeInTheDocument();
    expect(screen.getByText('Chats: nothing recorded in this window.')).toBeInTheDocument();
  });

  it('offers a retry when the read failed', async () => {
    const onRetry = vi.fn();
    render(<MetricChart label="Signups" points={[]} error="Network error" onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('BreakdownChart', () => {
  it('lists every slice with its count and share', () => {
    render(
      <BreakdownChart
        label="By role"
        total={10}
        slices={[
          { label: 'user', count: 7 },
          { label: 'admin', count: 3 },
        ]}
      />
    );

    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('holds off entirely when there is nothing to split', () => {
    render(<BreakdownChart label="By status" total={0} slices={[]} />);

    expect(screen.getByText(/nothing to break down yet/i)).toBeInTheDocument();
  });
});

type Row = { id: string; email: string };

const COLUMNS: Column<Row>[] = [
  {
    header: 'Email',
    cell: (row) => row.email,
    sorts: [{ token: 'email', direction: 'ascending' }],
  },
  {
    header: 'Joined',
    cell: () => 'Aug 1',
    sorts: [
      { token: 'newest', direction: 'descending' },
      { token: 'oldest', direction: 'ascending' },
    ],
  },
];

function table(overrides: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  return (
    <DataTable<Row>
      caption="Accounts"
      columns={COLUMNS}
      rows={[{ id: '1', email: 'vet@example.com' }]}
      rowKey={(row) => row.id}
      page={1}
      pages={1}
      total={1}
      limit={20}
      onPage={vi.fn()}
      {...overrides}
    />
  );
}

describe('DataTable', () => {
  it('counts the range off the page size the server reported', () => {
    render(
      table({
        rows: [
          { id: '1', email: 'a@example.com' },
          { id: '2', email: 'b@example.com' },
        ],
        page: 3,
        pages: 4,
        total: 63,
        limit: 20,
      })
    );

    expect(screen.getByText('41\u201342 of 63')).toBeInTheDocument();
  });

  it('advances a sortable header through its own tokens and says which way', async () => {
    const onSort = vi.fn();
    render(table({ sort: 'newest', onSort }));

    const joined = screen.getByRole('columnheader', { name: /joined/i });
    expect(joined).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('columnheader', { name: /email/i })).toHaveAttribute(
      'aria-sort',
      'none'
    );

    await userEvent.click(within(joined).getByRole('button'));
    expect(onSort).toHaveBeenCalledWith('oldest');
  });

  it('starts a column at its first token rather than skipping past it', async () => {
    const onSort = vi.fn();
    render(table({ sort: 'email', onSort }));

    await userEvent.click(
      within(screen.getByRole('columnheader', { name: /joined/i })).getByRole('button')
    );
    expect(onSort).toHaveBeenCalledWith('newest');
  });

  it('pages within bounds only', async () => {
    const onPage = vi.fn();
    render(table({ page: 1, pages: 3, total: 45, onPage }));

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('says the list is empty instead of showing a bare header', () => {
    render(table({ rows: [], total: 0, empty: 'No accounts match that.' }));

    expect(screen.getByText('No accounts match that.')).toBeInTheDocument();
    expect(screen.getByText('No rows')).toBeInTheDocument();
  });
});

function dialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  return (
    <ConfirmDialog
      open
      title="Take this post down?"
      description="It leaves the public feed."
      confirmLabel="Take down"
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
      {...overrides}
    />
  );
}

describe('ConfirmDialog', () => {
  it('holds the button until the required reason clears the shared floor', async () => {
    const onConfirm = vi.fn();
    render(dialog({ reason: 'required', onConfirm }));

    const confirm = screen.getByRole('button', { name: /take down/i });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/reason/i), 'no');
    expect(confirm).toBeDisabled();
    expect(
      screen.getByText(new RegExp(`at least ${MODERATION_REASON_MIN} characters`, 'i'))
    ).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/reason/i));
    await userEvent.type(screen.getByLabelText(/reason/i), 'Graphic imagery in the third section');
    expect(confirm).toBeEnabled();

    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('Graphic imagery in the third section');
  });

  it('confirms with no reason when the reason is optional', async () => {
    const onConfirm = vi.fn();
    render(dialog({ reason: 'optional', confirmLabel: 'Hide', onConfirm }));

    await userEvent.click(screen.getByRole('button', { name: /hide/i }));
    expect(onConfirm).toHaveBeenCalledWith(null);
  });

  it('still refuses a half-typed optional reason', async () => {
    render(dialog({ reason: 'optional', confirmLabel: 'Hide' }));

    await userEvent.type(screen.getByLabelText(/reason/i), 'eh');
    expect(screen.getByRole('button', { name: /hide/i })).toBeDisabled();
  });

  it('lands focus on the reason box, and on the button when there is none', () => {
    const { unmount } = render(dialog({ reason: 'required' }));
    expect(screen.getByLabelText(/reason/i)).toHaveFocus();
    unmount();

    render(dialog({ confirmLabel: 'Restore' }));
    expect(screen.getByRole('button', { name: /restore/i })).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const onCancel = vi.fn();
    render(dialog({ onCancel }));

    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows a refusal the server sent back and keeps the dialog open', () => {
    render(dialog({ error: 'You cannot change your own role.' }));

    expect(screen.getByRole('alert')).toHaveTextContent('You cannot change your own role.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('draws nothing at all when closed', () => {
    render(dialog({ open: false }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ModerationNote', () => {
  const verdict = {
    outcome: 'flagged' as const,
    categories: ['slur' as const],
    severity: 0.92,
    terms: ['a blocked term'],
    notes: 'Matched a blocked term.',
    model: null,
    checkedAt: '2026-08-26T09:00:00.000Z',
    reviewedBy: null,
    reviewedAt: null,
  };

  it('renders nothing for a post that was never screened', () => {
    const { container } = render(<ModerationNote moderation={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a post the screen passed', () => {
    const { container } = render(
      <ModerationNote moderation={{ ...verdict, outcome: 'clean', categories: [], terms: [] }} />
    );

    // A clean verdict is not news on a row. Only the ones asking for something are.
    expect(container).toBeEmptyDOMElement();
  });

  it('names the category, the confidence and the term that matched', () => {
    render(<ModerationNote moderation={verdict} />);

    expect(screen.getByText('Flagged')).toBeInTheDocument();
    expect(screen.getByText('slur')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    // The word itself, because that is what a false positive is judged from.
    expect(screen.getByText('a blocked term')).toBeInTheDocument();
  });

  it('says a post could not be checked rather than dressing it as a violation', () => {
    render(
      <ModerationNote
        moderation={{
          ...verdict,
          outcome: 'unavailable',
          categories: [],
          severity: 0,
          terms: [],
          notes: 'The automatic check could not be completed.',
        }}
      />
    );

    expect(screen.getByText('Not screened')).toBeInTheDocument();
    // No percentage: there is no confidence in a check that did not happen.
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('drops the request for attention once somebody has decided', () => {
    render(<ModerationNote moderation={{ ...verdict, reviewedAt: '2026-08-26T10:00:00.000Z' }} />);

    // Still on the row — it is why the post was ever in the queue — but no longer
    // asking for anything.
    expect(screen.getByText(/reviewed/)).toBeInTheDocument();
  });
});
