'use client';

import { useSession } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { Settings, User, Settings2, Bell, Shield, HelpCircle, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function FloatingSettings() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!session) return null;

  const sections = [
    {
      title: '👤 Account & Profile',
      items: [
        { label: 'Profile Edit', desc: 'Change username, profile picture, or bio.' },
        { label: 'Account Credentials', desc: 'Update email, change password, or set up 2FA.' },
        {
          label: 'Subscription / Plan',
          desc: 'View current tier, upgrade, or manage billing methods.',
        },
      ],
    },
    {
      title: '🎨 App Preferences',
      items: [
        { label: 'Appearance', desc: 'Toggle between light mode, dark mode, or system default.' },
        {
          label: 'Language & Region',
          desc: 'Choose the preferred display language and time zone formatting.',
        },
        {
          label: 'Media Quality',
          desc: 'Select data-saving options or high-definition streaming/upload modes.',
        },
      ],
    },
    {
      title: '🔔 Notifications',
      items: [
        { label: 'Push Alerts', desc: 'Toggle overall notifications on or off.' },
        { label: 'Granular Toggles', desc: 'Choose specific alerts to receive.' },
        { label: 'Do Not Disturb', desc: 'Set quiet hours to pause all incoming app alerts.' },
      ],
    },
    {
      title: '🔒 Privacy & Permissions',
      items: [
        {
          label: 'Data Sharing',
          desc: 'Opt-in or out of analytics tracking and personalized ads.',
        },
        { label: 'Device Access', desc: 'Shortcuts to manage device access.' },
        { label: 'Blocked Users', desc: 'View and manage a list of restricted accounts.' },
      ],
    },
    {
      title: 'ℹ️ Support & About',
      items: [
        { label: 'Help Center', desc: 'Links to FAQs, user guides, or support.' },
        { label: 'Legal', desc: 'View the Terms of Service, Privacy Policy.' },
        { label: 'App Info', desc: 'Display the current software version number.' },
      ],
    },
  ];

  return (
    <div ref={menuRef} className="fixed bottom-6 left-6 z-50">
      <div
        className={`absolute bottom-full left-0 mb-4 w-80 origin-bottom-left rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
      >
        <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
          <div className="p-3 mb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-lg">Settings</h3>
            <p className="text-xs text-slate-500">Manage your account and app preferences</p>
          </div>

          {sections.map((section, idx) => (
            <div key={idx} className="mb-4 last:mb-2 px-2">
              <h4 className="mb-2 text-sm font-bold text-slate-700">{section.title}</h4>
              <div className="flex flex-col gap-1">
                {section.items.map((item, itemIdx) => (
                  <button
                    key={itemIdx}
                    className="flex flex-col rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-50"
                  >
                    <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                    <span className="text-xs text-slate-500">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-2 border-t border-slate-100 px-2 pt-2 pb-1">
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsOpen((v) => !v)}
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-slate-800 hover:shadow-xl focus:outline-none"
        aria-label="Settings"
      >
        <Settings
          className={`h-6 w-6 transition-transform duration-500 ${
            isOpen ? 'rotate-180' : 'group-hover:rotate-90'
          }`}
        />
      </button>
    </div>
  );
}
