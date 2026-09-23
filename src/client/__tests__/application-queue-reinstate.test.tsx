import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { AdminProfessional } from '@/services/admin.service';
import ApplicationQueue from '../pages/admin/applications/application-queue';

const suspended = {
  id: 'a1',
  status: 'suspended',
  clinicName: 'Bayside Animal Clinic',
  licenseNumber: 'VET 1234',
  applicant: { id: 'u1', name: 'Marites Reyes', email: 'm@example.com', role: 'user' },
  rejectionReason: null,
  interviewAt: null,
  reviewedAt: '2026-09-01T00:00:00.000Z',
  createdAt: '2026-08-01T00:00:00.000Z',
} as unknown as AdminProfessional;

const mutation = { mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false, error: null };

vi.mock('@/hooks/useAdminProfessionals', () => ({
  useAdminProfessionals: () => ({
    data: { items: [suspended], page: 1, pages: 1, total: 1, limit: 20 },
    isPending: false,
    isError: false,
    error: null,
  }),
  useReviewProfessional: () => mutation,
  useScheduleInterview: () => mutation,
}));

function renderAccepted() {
  return render(
    <MemoryRouter initialEntries={['/admin/applications/accepted']}>
      <ApplicationQueue phase="accepted" />
    </MemoryRouter>
  );
}

describe('Accepted queue reinstatement', () => {
  it('offers a Status filter reaching suspended rows, so a pull is reversible', () => {
    renderAccepted();

    // The filter was previously only rendered on the Application phase, stranding suspended vets.
    const filter = screen.getByRole('combobox', { name: /Status/i });
    expect(filter).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Suspended' })).toBeInTheDocument();
  });

  it('shows the Accept action on a suspended row, which is the reinstate path', () => {
    renderAccepted();

    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
  });
});
