'use client';

import { useSession } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { Settings, LogOut } from 'lucide-react';
import AccountSection from './settings/sections/AccountSection';
import PreferencesSection from './settings/sections/PreferencesSection';
import NotificationsSection from './settings/sections/NotificationsSection';
import PrivacySection from './settings/sections/PrivacySection';
import SupportSection from './settings/sections/SupportSection';
import LogoutModal from './settings/LogoutModal';

export default function FloatingSettings() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
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

  if (status !== 'authenticated' || !session) return null;

  return (
    <div ref={menuRef} className="fixed bottom-6 left-6 z-50">
      <div
        className={`absolute bottom-full left-0 mb-4 w-80 origin-bottom-left rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
      >
        <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
          <div className="p-3 mb-2 border-b border-slate-100 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-blue-100 text-lg font-bold text-teal-700 ring-2 ring-teal-200">
              {session.user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-800">{session.user?.name ?? 'User'}</span>
              <span className="text-xs text-slate-500">{session.user?.email ?? 'Settings'}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <AccountSection
              isExpanded={expandedSection === 0}
              onToggle={() => setExpandedSection(expandedSection === 0 ? null : 0)}
            />
            <PreferencesSection
              isExpanded={expandedSection === 1}
              onToggle={() => setExpandedSection(expandedSection === 1 ? null : 1)}
            />
            <NotificationsSection
              isExpanded={expandedSection === 2}
              onToggle={() => setExpandedSection(expandedSection === 2 ? null : 2)}
            />
            <PrivacySection
              isExpanded={expandedSection === 3}
              onToggle={() => setExpandedSection(expandedSection === 3 ? null : 3)}
            />
            <SupportSection
              isExpanded={expandedSection === 4}
              onToggle={() => setExpandedSection(expandedSection === 4 ? null : 4)}
            />
          </div>

          <div className="mt-2 border-t border-slate-100 px-2 pt-2 pb-1">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        </div>
      </div>

      <LogoutModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} />

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
