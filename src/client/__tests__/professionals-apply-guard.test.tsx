import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequireTermsAgreed } from '../components/providers/RequireTermsAgreed';
import { forgetTermsAgreement, recordTermsAgreement } from '../lib/terms-consent';

// The guard reads the caller's own application, and that answer is all these cases vary
const lookup = { data: undefined as unknown, isLoading: false };
vi.mock('@/hooks/useProfessionals', () => ({ useOwnApplication: () => lookup }));

beforeEach(() => {
  lookup.data = undefined;
  lookup.isLoading = false;
  forgetTermsAgreement();
});

function renderGuarded() {
  render(
    <MemoryRouter initialEntries={['/professionals/apply']}>
      <Routes>
        <Route path="/professionals" element={<h1>Professionals</h1>} />
        <Route
          path="/professionals/apply"
          element={
            <RequireTermsAgreed>
              <h1>Enquiry form</h1>
            </RequireTermsAgreed>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

const theForm = () => screen.queryByRole('heading', { name: 'Enquiry form' });
const theLanding = () => screen.queryByRole('heading', { name: 'Professionals' });

describe('the enquiry route, reached by typing it rather than through the conditions', () => {
  it('sends a visitor who never agreed back to the start of the flow', () => {
    renderGuarded();

    expect(theForm()).not.toBeInTheDocument();
    expect(theLanding()).toBeInTheDocument();
  });

  it('lets through an applicant who agreed on the way', () => {
    recordTermsAgreement();

    renderGuarded();

    expect(theForm()).toBeInTheDocument();
  });

  it('lets through an application already on file, which was agreed to when it was sent', () => {
    lookup.data = { id: 'a1' };

    renderGuarded();

    expect(theForm()).toBeInTheDocument();
  });

  it('holds while the lookup is out rather than flashing the redirect', () => {
    lookup.isLoading = true;

    renderGuarded();

    expect(theForm()).not.toBeInTheDocument();
    expect(theLanding()).not.toBeInTheDocument();
  });
});
