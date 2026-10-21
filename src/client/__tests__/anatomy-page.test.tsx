import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnatomyPage from '../pages/anatomy/anatomy-page';
import {
  anatomyOrigin,
  anatomyView,
  authorizeAnatomy,
  handoffKey,
} from '../pages/anatomy/anatomy-integration';

vi.mock('../pages/anatomy/anatomy-integration', async (original) => ({
  ...(await original<typeof import('../pages/anatomy/anatomy-integration')>()),
  authorizeAnatomy: vi.fn(),
}));
beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
  vi.stubEnv('VITE_ANATOMY_ORIGIN', 'http://localhost:5176');
});
function show(path = '/anatomy') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AnatomyPage />
    </MemoryRouter>
  );
}
function message(type: string, origin = 'http://localhost:5176', source?: Window | null) {
  const frame = screen.getByTitle('Vetify Anatomy viewer') as HTMLIFrameElement;
  fireEvent(
    window,
    new MessageEvent('message', {
      origin,
      source: source === undefined ? frame.contentWindow : source,
      data: { type },
    })
  );
}

describe('Anatomy inside main navigation', () => {
  it('uses safe development and production defaults, and rejects unsafe origins and views', () => {
    expect(anatomyOrigin('', true)).toBe('http://localhost:5176');
    expect(anatomyOrigin('', false)).toBe('https://anatomy.vetify.page');
    expect(anatomyOrigin('https://evil.example/path', false)).toBeNull();
    expect(anatomyView('//evil.example')).toBe('/');
    expect(anatomyView('/bird/nervous')).toBe('/bird/nervous');
  });
  it('opens the selected embedded viewer without an extra launch button', () => {
    show('/anatomy?view=%2Fbird%2Fnervous');
    expect(screen.getByTitle('Vetify Anatomy viewer')).toHaveAttribute(
      'src',
      'http://localhost:5176/bird/nervous?embed=1'
    );
    expect(screen.queryByText('Open Anatomy')).not.toBeInTheDocument();
  });
  it('accepts authentication requests only from the configured iframe window and origin', () => {
    show();
    message('vetify-anatomy:authenticate', 'https://attacker.example');
    message('vetify-anatomy:authenticate', 'http://localhost:5176', window);
    expect(authorizeAnatomy).not.toHaveBeenCalled();
    message('vetify-anatomy:authenticate');
    expect(authorizeAnatomy).toHaveBeenCalledWith('http://localhost:5176', '/');
    message('vetify-anatomy:authenticate');
    expect(authorizeAnatomy).toHaveBeenCalledOnce();
  });
  it('waits for main session validation before starting a requested handoff', () => {
    const page = render(
      <MemoryRouter>
        <AnatomyPage canAuthenticate={false} />
      </MemoryRouter>
    );
    message('vetify-anatomy:authenticate');
    expect(authorizeAnatomy).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(handoffKey)).toBeNull();
    page.rerender(
      <MemoryRouter>
        <AnatomyPage canAuthenticate />
      </MemoryRouter>
    );
    expect(authorizeAnatomy).toHaveBeenCalledOnce();
    expect(authorizeAnatomy).toHaveBeenCalledWith('http://localhost:5176', '/');
  });
  it('stops repeated automatic redirects and allows an explicit retry', () => {
    sessionStorage.setItem(handoffKey, String(Date.now()));
    show();
    message('vetify-anatomy:authenticate');
    expect(screen.getByRole('alert')).toHaveTextContent('could not restore your session');
    expect(authorizeAnatomy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    message('vetify-anatomy:authenticate');
    expect(authorizeAnatomy).toHaveBeenCalledOnce();
  });
  it('clears the redirect guard only after a trusted ready message', () => {
    sessionStorage.setItem(handoffKey, String(Date.now()));
    show();
    message('vetify-anatomy:ready', 'https://attacker.example');
    expect(sessionStorage.getItem(handoffKey)).not.toBeNull();
    message('vetify-anatomy:ready');
    expect(sessionStorage.getItem(handoffKey)).toBeNull();
  });
  it('shows failed authentication under main navigation without another automatic redirect', () => {
    show('/anatomy?auth=failed');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTitle('Vetify Anatomy viewer')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByTitle('Vetify Anatomy viewer')).toBeInTheDocument();
  });
});
