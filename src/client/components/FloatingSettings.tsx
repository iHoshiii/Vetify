import { useAuth } from '@/components/providers/AuthProvider';
import { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import SupportSection from './settings/sections/SupportSection';
import ConsoleLinks from './settings/console-links';
import LogoutModal from './settings/LogoutModal';

// The account tray on the public site. The professional console has no tray: its settings are a section of the console, so a vet changes them where they work rather than in something that hovers.
export default function FloatingSettings() {
  // Subscribed to the provider rather than reading localStorage: this component
  // renders nothing while anonymous, and a bare read gave it no reason to
  // re-render when a session appeared.
  const { user } = useAuth();
  const { pathname } = useLocation();
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

  if (!user || pathname.startsWith('/settings')) return null;

  return (
    <div ref={menuRef} className="fixed bottom-6 left-6 z-50">
      <div
        className={`absolute bottom-full left-0 mb-4 w-80 origin-bottom-left rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
      >
        <div className="max-h-[70vh] overflow-y-auto p-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
          <div className="p-3 mb-2 border-b border-slate-100 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-blue-100 text-lg font-bold text-teal-700 ring-2 ring-teal-200">
              {user.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-bold text-slate-800">{user.name ?? 'User'}</span>
              <span className="truncate text-xs text-slate-500">{user.email}</span>
            </div>
          </div>
          <div className="flex flex-col">
            {/* Account, notifications, and privacy moved to the full /settings page; the tray links there rather than holding those forms in 320px. */}
            <Link
              to="/settings/profile"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50"
            >
              <span className="flex items-center gap-3">
                <SlidersHorizontal size={18} className="text-slate-500" />
                <span className="text-sm font-semibold text-slate-800">Settings</span>
              </span>
              <ChevronRight size={16} className="text-slate-400" />
            </Link>
            <SupportSection
              isExpanded={expandedSection === 0}
              onToggle={() => setExpandedSection(expandedSection === 0 ? null : 0)}
            />
          </div>

          <div className="mt-2 border-t border-slate-100 px-2 pt-2 pb-1">
            {/* Above Log Out, in the same group: both are things you do to the
                session rather than settings you change. */}
            <ConsoleLinks onNavigate={() => setIsOpen(false)} />
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
