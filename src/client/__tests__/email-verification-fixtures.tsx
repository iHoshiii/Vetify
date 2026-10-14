import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { EmailVerificationDelivery } from '@shared/email-verification';

import { AuthProvider } from '@/components/providers/AuthProvider';
import { type AuthSession } from '@/lib/auth';
import SignupPage from '@/pages/signup/signup-page';

export const SESSION: AuthSession = {
  accessToken: 'signup-token',
  user: {
    id: 'user-1',
    name: 'Pet Owner',
    email: 'pet@example.com',
    provider: 'local',
    emailVerified: false,
    avatarUrl: null,
    role: 'user',
  },
};

export function delivery(sent = true, cooldown = 60): EmailVerificationDelivery {
  return {
    sent,
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    resendAvailableAt: new Date(Date.now() + cooldown * 1000).toISOString(),
  };
}

export function response(status: number, body: unknown): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}

export function codeInputs(): HTMLInputElement[] {
  return within(screen.getByRole('group', { name: 'Confirmation code' })).getAllByRole(
    'textbox'
  ) as HTMLInputElement[];
}

export function fillConfirmationCode(code: string): void {
  codeInputs().forEach((input, index) => {
    fireEvent.change(input, { target: { value: code[index] ?? '' } });
  });
}

export function renderSignup(from = '/planner') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/signup', state: { from } }]}>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/planner" element={<div>Planner destination</div>} />
          <Route path="/" element={<div>Home destination</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}
