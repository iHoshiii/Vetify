import { useEffect } from 'react';

import { usePreferences } from '@/hooks/usePreferences';
import { useAuth } from './AuthProvider';
import { useLocalePreferences } from './LocaleProvider';

export default function PreferenceSync() {
  const { user } = useAuth();
  const locale = useLocalePreferences();
  const { data } = usePreferences(Boolean(user));

  useEffect(() => {
    if (data?.region.timeZone && data.region.timeZone !== locale.timeZone) {
      locale.save('en', data.region.timeZone);
    }
  }, [data?.region.timeZone, locale]);

  return null;
}
