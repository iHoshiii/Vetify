import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import {
  LocaleProvider,
  currentLocalePreferences,
  useLocalePreferences,
} from '@/components/providers/LocaleProvider';

function Consumer() {
  const preferences = useLocalePreferences();
  return (
    <>
      <output>{`${preferences.locale}|${preferences.timeZone}`}</output>
      <button type="button" onClick={() => preferences.save('ja', 'Asia/Tokyo')}>
        Save Japanese
      </button>
    </>
  );
}

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = 'en';
});

describe('locale preferences', () => {
  it('updates the active locale and time zone as soon as they are saved', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <Consumer />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Save Japanese' }));

    expect(screen.getByText('ja-JP|Asia/Tokyo')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'ja');
    expect(currentLocalePreferences()).toMatchObject({ locale: 'ja-JP', timeZone: 'Asia/Tokyo' });
  });

  it('falls back safely when stored values are not supported', () => {
    window.localStorage.setItem('vetify-lang', 'made-up');
    window.localStorage.setItem('vetify-timezone', 'Moon/Base');

    expect(currentLocalePreferences()).toMatchObject({
      language: 'en',
      locale: 'en-PH',
      timeZone: 'Asia/Manila',
    });
  });
});
