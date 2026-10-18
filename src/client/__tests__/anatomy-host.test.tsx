import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAnatomyHost } from '../pages/anatomy/use-anatomy-host';

const postMessage = vi.fn();
function Shell() {
  useAnatomyHost();
  const navigate = useNavigate();
  return (
    <>
      <Link to="/services">Services</Link>
      <button onClick={() => navigate('/')}>Leave</button>
    </>
  );
}
beforeEach(() => {
  postMessage.mockReset();
  vi.stubEnv('VITE_ANATOMY_ORIGIN', 'http://localhost:5176');
  vi.spyOn(window, 'parent', 'get').mockReturnValue({ postMessage } as unknown as Window);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it('makes hosted navbar links navigate the outer page through the trusted Anatomy host', () => {
  render(
    <MemoryRouter initialEntries={['/anatomy?hosted=1']}>
      <Shell />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByText('Services'));
  expect(postMessage).toHaveBeenCalledWith(
    { type: 'vetify-anatomy:navigate', path: '/services' },
    'http://localhost:5176'
  );
});
it('forwards programmatic navigation such as main logout to the outer page', async () => {
  render(
    <MemoryRouter initialEntries={['/anatomy?hosted=1']}>
      <Shell />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByText('Leave'));
  await waitFor(() =>
    expect(postMessage).toHaveBeenCalledWith(
      { type: 'vetify-anatomy:navigate', path: '/' },
      'http://localhost:5176'
    )
  );
});
it('leaves ordinary main pages independent of the Anatomy host', () => {
  render(
    <MemoryRouter initialEntries={['/services']}>
      <Shell />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByText('Leave'));
  expect(postMessage).not.toHaveBeenCalled();
});
