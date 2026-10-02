import { useAuth } from '@/components/providers/AuthProvider';
import { useState, useRef, useEffect } from 'react';
import { LogOut, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import SupportSection from './settings/sections/SupportSection';
import ConsoleLinks from './settings/console-links';
import LogoutModal from './settings/LogoutModal';

// The account menu in the header cluster. The professional console has no tray: its settings are a section of the console, so a vet changes them where they work.
export default function FloatingSettings() {
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
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Account"
        aria-expanded={isOpen}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-vet-primary/10 text-sm font-bold text-vet-primary ring-1 ring-vet-primary/20 transition-colors hover:bg-vet-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vet-primary"
      >
        {user.name?.charAt(0).toUpperCase() ?? 'U'}
      </button>

      <div
        className={`absolute right-0 top-full mt-2 w-80 origin-top-right rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 transition-all duration-200 ${
          isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
      >
        <div className="max-h-[70vh] overflow-y-auto p-2">
          <div className="mb-2 flex items-center gap-3 border-b border-slate-100 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vet-primary/10 text-lg font-bold text-vet-primary ring-1 ring-vet-primary/20">
              {user.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-bold text-slate-800">{user.name ?? 'User'}</span>
              <span className="truncate text-xs text-slate-500">{user.email}</span>
            </div>
          </div>
          <div className="flex flex-col">
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

          <div className="mt-2 border-t border-slate-100 px-2 pb-1 pt-2">
            <ConsoleLinks onNavigate={() => setIsOpen(false)} />
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </div>
      </div>

      <LogoutModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} />
    </div>
  );
}
