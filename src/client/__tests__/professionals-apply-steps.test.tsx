import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ProfessionalsPage from '../pages/professionals/professionals-page';

// Only the interval the countdown runs on: faking setTimeout as well would stall the
// microtask flush React's act() waits for, and every test would time out.
beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderPage() {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/professionals']}>
      <Routes>
        <Route path="/professionals" element={<ProfessionalsPage />} />
        <Route path="/professionals/apply" element={<h1>Enquiry form</h1>} />
      </Routes>
    </MemoryRouter>
  );
  return user;
}

const applyButton = () => screen.getByRole('button', { name: 'Apply to join' });
const dialog = () => screen.getByRole('dialog');
const onTheForm = () => screen.queryByRole('heading', { name: 'Enquiry form' });

describe('the two steps between Apply to join and the enquiry form', () => {
  it('opens the requirements first, and neither the conditions nor the form', async () => {
    const user = renderPage();

    await user.click(applyButton());

    expect(within(dialog()).getByText('Eligibility Requirements')).toBeInTheDocument();
    expect(within(dialog()).queryByText('Terms & Conditions')).not.toBeInTheDocument();
    expect(onTheForm()).not.toBeInTheDocument();
  });

  it('carries on from the requirements to the conditions', async () => {
    const user = renderPage();

    await user.click(applyButton());
    await user.click(within(dialog()).getByRole('button', { name: 'Continue' }));

    expect(within(dialog()).getByText('Terms & Conditions')).toBeInTheDocument();
    expect(onTheForm()).not.toBeInTheDocument();
  });

  it('goes back from the conditions to the requirements', async () => {
    const user = renderPage();

    await user.click(applyButton());
    await user.click(within(dialog()).getByRole('button', { name: 'Continue' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Go back' }));

    expect(within(dialog()).getByText('Eligibility Requirements')).toBeInTheDocument();
    expect(onTheForm()).not.toBeInTheDocument();
  });

  it('closes on going back from the requirements, having reached nothing', async () => {
    const user = renderPage();

    await user.click(applyButton());
    await user.click(within(dialog()).getByRole('button', { name: 'Go back' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onTheForm()).not.toBeInTheDocument();
  });
});
