import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type LocalePreferences = { language: string; locale: string; timeZone: string };

const LANGUAGE_LOCALES: Record<string, string> = {
  en: 'en-PH',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  tl: 'fil-PH',
};

const TIME_ZONES = new Set([
  'Asia/Manila',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
]);

const DEFAULTS: LocalePreferences = {
  language: 'en',
  locale: LANGUAGE_LOCALES.en,
  timeZone: 'Asia/Manila',
};

export function currentLocalePreferences(): LocalePreferences {
  if (typeof window === 'undefined') return DEFAULTS;
  const language = window.localStorage.getItem('vetify-lang') ?? DEFAULTS.language;
  const timeZone = window.localStorage.getItem('vetify-timezone') ?? DEFAULTS.timeZone;
  return {
    language: LANGUAGE_LOCALES[language] ? language : DEFAULTS.language,
    locale: LANGUAGE_LOCALES[language] ?? DEFAULTS.locale,
    timeZone: TIME_ZONES.has(timeZone) ? timeZone : DEFAULTS.timeZone,
  };
}

type LocaleContextValue = LocalePreferences & {
  save: (language: string, timeZone: string) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(currentLocalePreferences);

  useEffect(() => {
    document.documentElement.lang = preferences.language;
  }, [preferences.language]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      ...preferences,
      save(language, timeZone) {
        const nextLanguage = LANGUAGE_LOCALES[language] ? language : DEFAULTS.language;
        const nextTimeZone = TIME_ZONES.has(timeZone) ? timeZone : DEFAULTS.timeZone;
        window.localStorage.setItem('vetify-lang', nextLanguage);
        window.localStorage.setItem('vetify-timezone', nextTimeZone);
        setPreferences({
          language: nextLanguage,
          locale: LANGUAGE_LOCALES[nextLanguage],
          timeZone: nextTimeZone,
        });
      },
    }),
    [preferences]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocalePreferences(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (value) return value;
  return {
    ...currentLocalePreferences(),
    save(language, timeZone) {
      window.localStorage.setItem('vetify-lang', language);
      window.localStorage.setItem('vetify-timezone', timeZone);
    },
  };
}
