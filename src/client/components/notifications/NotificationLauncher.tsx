import { useAuth } from '@/components/providers/AuthProvider';
import { useUnreadNotifications } from '@/hooks/useNotifications';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import NotificationPanel from './NotificationPanel';

// The notification bell in the header cluster. Signed-in only, since a feed belongs to one account.
export default function NotificationLauncher() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: unread = 0 } = useUnreadNotifications(Boolean(user));
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on an outside click, the same gesture the chat launcher uses.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-vet-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vet-primary"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2">
          <NotificationPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
