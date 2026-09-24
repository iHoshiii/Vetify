import { useAuth } from '@/components/providers/AuthProvider';
import { useUnreadNotifications } from '@/hooks/useNotifications';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import NotificationPanel from './NotificationPanel';

// The notification bell, bottom-right beside the chat launcher. Signed-in only, since a feed belongs to one account.
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
    <div ref={rootRef} className="fixed bottom-6 right-24 z-50 flex flex-col items-end gap-3">
      {open && <NotificationPanel onClose={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-label="Notifications"
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-teal-700 shadow-lg ring-1 ring-slate-200 transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none"
      >
        <Bell className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
