import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import VerifyEmailPage from '@/pages/email-verification/verify-email-page';

function SignupDestination() {
  const location = useLocation();
  return (
    <output>
      {location.pathname}
      {location.hash}
    </output>
  );
}

describe('legacy email verification links', () => {
  it.each(['/verify-email', '/verify-email#token=bad', `/verify-email#token=${'a'.repeat(64)}`])(
    'redirects %s to the current signup confirmation flow without carrying the old token',
    (path) => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/signup" element={<SignupDestination />} />
          </Routes>
        </MemoryRouter>
      );
      expect(screen.getByRole('status')).toHaveTextContent(/^\/signup$/);
    }
  );
});
