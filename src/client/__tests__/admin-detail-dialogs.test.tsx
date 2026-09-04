import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApplicationDialog } from '../pages/admin/_components/application-dialog';
import { EnquiryDialog } from '../pages/admin/_components/enquiry-dialog';
import type { AdminInquiry, AdminProfessional } from '../services/admin.service';

/**
 * The two read-only panels the application pipeline opens.
 *
 * Both were a `<details>` folded into the table row until they became dialogs,
 * which means the submission is now in the DOM only while somebody is reading it
 * rather than once per row on the page. What each one carries is worth stating
 * field by field: a line lost in that move is a line a reviewer no longer has in
 * front of them when they accept or turn somebody down.
 */

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

describe('ApplicationDialog', () => {
  it('is a modal named after whoever filed it', () => {
    render(<ApplicationDialog application={application()} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Named by its heading rather than by a hardcoded label, so the reviewer hears
    // whose application they opened and not the word "Application" four times.
    expect(dialog).toHaveAccessibleName('Marites Reyes');
    expect(within(dialog).getByText('marites@clinic.ph')).toBeInTheDocument();
  });

  it('carries every field the verdict rests on', () => {
    render(<ApplicationDialog application={application()} onClose={vi.fn()} />);

    // The licence and the authority together: neither is checkable alone.
    expect(screen.getByText('VET 1234-PH \u00b7 PRC')).toBeInTheDocument();
    expect(
      screen.getByText('Mandaue Animal Clinic \u00b7 9 Rizal Avenue, Cebu City')
    ).toBeInTheDocument();
    expect(screen.getByText('15 years')).toBeInTheDocument();
    expect(screen.getByText('$60/hr \u00b7 surgery')).toBeInTheDocument();
    expect(screen.getByText('Fifteen years of small animal practice.')).toBeInTheDocument();
  });

  it('reads a single year as a year', () => {
    render(
      <ApplicationDialog application={application({ yearsExperience: 1 })} onClose={vi.fn()} />
    );

    expect(screen.getByText('1 year')).toBeInTheDocument();
  });

  it('falls back to the clinic when the account is gone from under the application', () => {
    render(<ApplicationDialog application={application({ applicant: null })} onClose={vi.fn()} />);

    // The submission outlives the account, and the licence number is the one
    // identifier it carries by itself.
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Mandaue Animal Clinic');
    expect(screen.getByText('Licence VET 1234-PH')).toBeInTheDocument();
  });

  it('opens credentials in a new tab and severs the referrer', () => {
    render(<ApplicationDialog application={application()} onClose={vi.fn()} />);

    // These are links a stranger supplied and the reader is signed in as an admin,
    // so the console's origin does not travel with the click.
    const link = screen.getByRole('link', { name: 'https://example.test/diploma.pdf' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('says nothing about the rate until the rate was flagged', () => {
    const { unmount } = render(<ApplicationDialog application={application()} onClose={vi.fn()} />);

    expect(screen.queryByText(/Above the rate/)).not.toBeInTheDocument();
    unmount();

    render(
      <ApplicationDialog
        application={application({ flaggedForRateReview: true })}
        onClose={vi.fn()}
      />
    );

    // Not a block on anything — the listing is live either way — just the one number
    // on the submission a reviewer might want to ask about.
    expect(screen.getByText('Above the rate their 15 yrs allows')).toBeInTheDocument();
  });
});

describe('EnquiryDialog', () => {
  it('is a modal named after whoever wrote in', () => {
    render(<EnquiryDialog inquiry={inquiry()} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Marites Reyes');
    expect(within(dialog).getByText('marites@clinic.ph')).toBeInTheDocument();
  });

  it('shows what the enquiry gave, including where they practise', () => {
    render(<EnquiryDialog inquiry={inquiry()} onClose={vi.fn()} />);

    expect(screen.getByText('VET 1234-PH')).toBeInTheDocument();
    expect(
      screen.getByText('Cebu City, Cebu \u00b7 practises in Mandaue, Cebu')
    ).toBeInTheDocument();
    expect(screen.getByText('+63 32 555 0101')).toBeInTheDocument();
    expect(screen.getByText('15 years')).toBeInTheDocument();
    // The whole basis for the decision, so it is the field that must never go missing.
    expect(screen.getByText(/Fifteen years of small animal practice/)).toBeInTheDocument();
  });

  it('leaves out the rows an enquiry did not fill in', () => {
    render(
      <EnquiryDialog
        inquiry={inquiry({ phone: null, yearsExperience: null, clinicLocation: null })}
        onClose={vi.fn()}
      />
    );

    // Absent rather than empty: a labelled row with nothing under it reads as data
    // that failed to load rather than a question nobody answered.
    expect(screen.queryByText('Phone number')).not.toBeInTheDocument();
    expect(screen.queryByText('Experience')).not.toBeInTheDocument();
    expect(screen.getByText('Cebu City, Cebu')).toBeInTheDocument();
  });

  it('keeps the note that went out and the reason it was turned down', () => {
    render(
      <EnquiryDialog
        inquiry={inquiry({
          status: 'declined',
          inviteNote: 'Bring the board certificate.',
          declineReason: 'Automatic: no licence number was given',
        })}
        onClose={vi.fn()}
      />
    );

    // Both halves of the history. A declined enquiry is not deleted, because the same
    // person may write in again and the previous answer is the context for it.
    expect(screen.getByText('Bring the board certificate.')).toBeInTheDocument();
    expect(screen.getByText('Automatic: no licence number was given')).toBeInTheDocument();
  });
});

/**
 * Both dialogs carry their own copy of the same dismissal code, so both are asked
 * the same three questions here — a fix applied to one of them and not the other is
 * exactly the failure this catches.
 */
describe.each([
  [
    'ApplicationDialog',
    (onClose: () => void) => <ApplicationDialog application={application()} onClose={onClose} />,
  ],
  [
    'EnquiryDialog',
    (onClose: () => void) => <EnquiryDialog inquiry={inquiry()} onClose={onClose} />,
  ],
])('%s dismissal', (_name, mount) => {
  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(mount(onClose));

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on the backdrop, which is hidden from assistive tech', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(mount(onClose));

    // A backdrop is not a button: Escape and the close buttons are the reachable
    // ways out, and this one is only there for the mouse.
    const backdrop = screen.getByRole('presentation', { hidden: true });
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');

    await user.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the corner and from the foot of the panel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(mount(onClose));

    // Two buttons, one name each way out. Read-only panels get no Cancel, because
    // there is nothing here to cancel.
    const [corner, foot] = screen.getAllByRole('button', { name: 'Close' });

    await user.click(corner);
    await user.click(foot);

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
