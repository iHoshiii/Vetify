'use client';

import { useState, useEffect } from 'react';

interface SectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'tl', label: 'Filipino', flag: '🇵🇭' },
];

const timezones = [
  { value: 'Asia/Manila', label: 'Manila (GMT+8)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Asia/Seoul', label: 'Seoul (GMT+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+11)' },
];

export default function PreferencesSection({ isExpanded, onToggle }: SectionProps) {
  const [selectedLang, setSelectedLang] = useState('en');
  const [selectedTimezone, setSelectedTimezone] = useState('Asia/Manila');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('vetify-lang');
    const savedTz = localStorage.getItem('vetify-timezone');
    if (savedLang) setSelectedLang(savedLang);
    if (savedTz) setSelectedTimezone(savedTz);
    setMounted(true);
  }, []);

  const handleLangChange = (code: string) => {
    setSelectedLang(code);
    localStorage.setItem('vetify-lang', code);
  };

  const handleTimezoneChange = (tz: string) => {
    setSelectedTimezone(tz);
    localStorage.setItem('vetify-timezone', tz);
  };

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <span className="text-sm font-bold text-slate-700">🎨 App Preferences</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-[800px]' : 'max-h-0'
        }`}
      >
        <div className="flex flex-col gap-3 px-2 pb-3">
          {/* Language */}
          <div className="rounded-xl px-3 py-2">
            <span className="text-sm font-semibold text-slate-800">Language</span>
            <p className="mb-2 text-xs text-slate-500">Choose your preferred display language.</p>
            {mounted && (
              <div className="grid grid-cols-2 gap-1.5">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLangChange(lang.code)}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-200 ${
                      selectedLang === lang.code
                        ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-500'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timezone */}
          <div className="rounded-xl px-3 py-2">
            <span className="text-sm font-semibold text-slate-800">Time Zone</span>
            <p className="mb-2 text-xs text-slate-500">
              Set your preferred time zone for scheduling.
            </p>
            {mounted && (
              <select
                value={selectedTimezone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Media Quality */}
          <button className="flex flex-col rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-50">
            <span className="text-sm font-semibold text-slate-800">Media Quality</span>
            <span className="text-xs text-slate-500">
              Select data-saving options or high-definition streaming/upload modes.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
