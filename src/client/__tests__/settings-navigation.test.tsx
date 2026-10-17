import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultUserPreferences, type UserPreferencesUpdate } from '@shared/schemas';
import { SettingsNavigationApp as App } from './settings-navigation-fixtures';

let preferences = defaultUserPreferences();
const save = vi.fn();
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'owner', provider: 'local', name: 'Owner', email: 'owner@example.com' },
    logout: vi.fn(),
  }),
}));
vi.mock('@/hooks/useAccount', () => ({
  useUpdateProfile: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false }),
  useChangePassword: () => ({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/usePreferences', () => ({ usePreferences: () => ({ data: preferences }) }));
vi.mock('@/components/settings/consumer/save-preferences', () => ({
  useSavePreferences: () => ({ pending: false, error: null, saved: false, save }),
}));

function edit(section: string) {
  if (section === 'notifications') {
    fireEvent.click(screen.getByRole('switch', { name: 'In-app notifications' }));
  } else {
    const label =
      section === 'profile'
        ? 'Display name'
        : section === 'security'
        ? 'Current password'
        : 'Timezone';
    fireEvent.change(screen.getByLabelText(label), {
      target: { value: section === 'region' ? 'Asia/Tokyo' : 'Unsaved edit' },
    });
  }
}

function expectDraft(section: string) {
  if (section === 'notifications') {
    expect(screen.getByRole('switch', { name: 'In-app notifications' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  } else {
    const label =
      section === 'profile'
        ? 'Display name'
        : section === 'security'
        ? 'Current password'
        : 'Timezone';
    expect(screen.getByLabelText(label)).toHaveValue(
      section === 'region' ? 'Asia/Tokyo' : 'Unsaved edit'
    );
  }
}

describe('unsaved settings navigation', () => {
  beforeEach(() => {
    preferences = defaultUserPreferences();
    save.mockReset();
  });

  it.each(['profile', 'security', 'notifications', 'region'])(
    'preserves %s edits on stay and leaves only after discard',
    (section) => {
      render(<App section={section} />);
      edit(section);
      const destination = section === 'profile' ? /^Security/ : /^Profile/;
      fireEvent.click(screen.getByRole('link', { name: destination }));
      expect(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument();
      const unload = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(unload);
      expect(unload.defaultPrevented).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: 'Stay here' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expectDraft(section);
      fireEvent.click(screen.getByRole('link', { name: destination }));
      fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: section === 'profile' ? 'Security' : 'Profile',
        })
      ).toBeInTheDocument();
      const cleanUnload = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(cleanUnload);
      expect(cleanUnload.defaultPrevented).toBe(false);
    }
  );

  it('keeps the mobile selection and draft on Escape, then follows the selected destination on discard', () => {
    render(<App section="profile" />);
    edit('profile');
    fireEvent.change(screen.getByRole('combobox', { name: 'Settings section' }), {
      target: { value: 'region' },
    });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('combobox', { name: 'Settings section' })).toHaveValue('profile');
    expectDraft('profile');
    fireEvent.change(screen.getByRole('combobox', { name: 'Settings section' }), {
      target: { value: 'region' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByLabelText('Timezone')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Settings section' })).toHaveValue('region');
  });

  it.each(['profile', 'security', 'notifications', 'region'])(
    'clears the warning after resetting %s edits',
    (section) => {
      render(<App section={section} />);
      edit(section);
      fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
      fireEvent.click(
        screen.getByRole('link', { name: section === 'profile' ? /^Security/ : /^Profile/ })
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: section === 'profile' ? 'Security' : 'Profile',
        })
      ).toBeInTheDocument();
    }
  );

  it.each(['notifications', 'region'])(
    'clears the warning after %s changes save successfully',
    (section) => {
      const page = render(<App section={section} />);
      edit(section);
      fireEvent.click(
        screen.getByRole('button', {
          name: section === 'region' ? 'Save region' : 'Save notifications',
        })
      );
      expect(save).toHaveBeenCalledTimes(1);
      preferences = { ...preferences, ...(save.mock.calls[0][0] as UserPreferencesUpdate) };
      page.rerender(<App section={section} />);
      fireEvent.click(screen.getByRole('link', { name: /^Profile/ }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Display name')).toBeInTheDocument();
    }
  );
});
