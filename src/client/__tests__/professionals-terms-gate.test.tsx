import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { READ_SECONDS } from '../hooks/use-terms-gate';
import { forgetTermsAgreement, hasAgreedToTerms } from '../lib/terms-consent';
import ProfessionalsPage from '../pages/professionals/professionals-page';

// Only the interval the countdown runs on: faking setTimeout as well would stall the
// microtask flush React's act() waits for, and every test would time out.
beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  forgetTermsAgreement();
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
const consentBox = () => within(dialog()).getByRole('checkbox');
const forward = () => within(dialog()).getByRole('button', { name: 'Agree and continue' });
const countdown = () => within(dialog()).queryByText(/^\d+s$/);

// The conditions are the second step, so every case walks the requirements first
async function openTheConditions(user: ReturnType<typeof userEvent.setup>) {
  await user.click(applyButton());
  await user.click(within(dialog()).getByRole('button', { name: 'Continue' }));
}

async function waitOutTheCountdown() {
  await act(async () => {
    vi.advanceTimersByTime(READ_SECONDS * 1000);
  });
}

// jsdom lays nothing out, so the conditions read as already scrolled through. Stubbing the
// geometry is the only way to give the list an end to reach.
function stubScrolling(view: { top: number; content: number; visible: number }) {
  vi.spyOn(Element.prototype, 'scrollTop', 'get').mockImplementation(() => view.top);
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(() => view.content);
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(() => view.visible);
}

describe('the conditions an applicant agrees to before the enquiry form', () => {
  it('will not take the tick until the reading time has passed', async () => {
    const user = renderPage();

    await openTheConditions(user);
    expect(consentBox()).toBeDisabled();
    expect(countdown()).toHaveTextContent(`${READ_SECONDS}s`);

    await waitOutTheCountdown();

    expect(consentBox()).toBeEnabled();
    expect(countdown()).not.toBeInTheDocument();
  });

  it('starts the countdown at the last condition, not when the dialog opens', async () => {
    const view = { top: 0, content: 900, visible: 300 };
    stubScrolling(view);
    const user = renderPage();

    await openTheConditions(user);
    await waitOutTheCountdown();

    // Nothing counted, because the applicant never reached Termination
    expect(countdown()).not.toBeInTheDocument();
    expect(consentBox()).toBeDisabled();

    view.top = 600;
    fireEvent.scroll(within(dialog()).getByRole('list', { name: 'Platform conditions' }));
    expect(countdown()).toHaveTextContent(`${READ_SECONDS}s`);
    expect(consentBox()).toBeDisabled();

    await waitOutTheCountdown();

    expect(consentBox()).toBeEnabled();
  });

  it('holds the button until the box is ticked', async () => {
    const user = renderPage();

    await openTheConditions(user);
    await waitOutTheCountdown();
    expect(forward()).toBeDisabled();

    await user.click(consentBox());

    expect(forward()).toBeEnabled();
  });

  it('reaches the form once the conditions are agreed to', async () => {
    const user = renderPage();

    await openTheConditions(user);
    await waitOutTheCountdown();
    await user.click(consentBox());
    await user.click(forward());

    expect(onTheForm()).toBeInTheDocument();
    // Written down for the guard on the route, which is what a typed URL now meets
    expect(hasAgreedToTerms()).toBe(true);
  });

  it('asks again when the conditions are reopened rather than remembering the tick', async () => {
    const user = renderPage();

    await openTheConditions(user);
    await waitOutTheCountdown();
    await user.click(consentBox());

    // Back to the requirements and forward again, which is a fresh second step
    await user.click(within(dialog()).getByRole('button', { name: 'Go back' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Continue' }));

    expect(consentBox()).not.toBeChecked();
    expect(consentBox()).toBeDisabled();
    expect(forward()).toBeDisabled();
  });
});
