'use client';

import { useEffect, useState } from 'react';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function LanguageModal({ isOpen, onClose }: LanguageModalProps) {
  const [selectedLang, setSelectedLang] = useState('en');
  const [selectedTimezone, setSelectedTimezone] = useState('Asia/Manila');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const savedLang = localStorage.getItem('vetify-lang');
      const savedTz = localStorage.getItem('vetify-timezone');
      if (savedLang) setSelectedLang(savedLang);
      if (savedTz) setSelectedTimezone(savedTz);
      setMounted(true);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('vetify-lang', selectedLang);
    localStorage.setItem('vetify-timezone', selectedTimezone);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-all dark:bg-black/60">
      <div className="w-full max-w-md scale-100 rounded-2xl bg-white p-6 shadow-2xl transition-transform dark:bg-slate-900 dark:shadow-black/30">
        <h3 className="mb-2 text-xl font-bold text-slate-800 dark:text-slate-100">
          Language & Region
        </h3>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          Choose your preferred display language and time zone formatting.
        </p>

        {mounted && (
          <div className="mb-6 flex flex-col gap-6">
            <div>
              <span className="mb-3 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Language
              </span>
              <div className="grid grid-cols-2 gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLang(lang.code)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      selectedLang === lang.code
                        ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-500 dark:bg-teal-900/40 dark:text-teal-300 dark:ring-teal-400'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-3 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Time Zone
              </span>
              <select
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-400 dark:focus:bg-slate-900 dark:focus:ring-teal-900"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-teal-700 hover:shadow-lg dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
