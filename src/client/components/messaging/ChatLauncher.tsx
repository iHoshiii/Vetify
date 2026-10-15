import { useAuth } from '@/components/providers/AuthProvider';
import { useUnreadCount } from '@/hooks/useMessages';
import { MessageCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import ChatPanel from './ChatPanel';
import { useChatPanel } from './chat-context';

// The owner's messaging button in the header cluster. Signed-in only, since a thread names two accounts.
export default function ChatLauncher() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { open, openPanel, closePanel } = useChatPanel();
  const { data: unread = 0 } = useUnreadCount(Boolean(user));
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on an outside click, the same gesture the settings tray uses.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      // Modals and menus (delete confirm, unsend, message menu) render outside this box via portals; a click inside one must not close the panel.
      if (
        target instanceof Element &&
        target.closest('[role="dialog"],[role="alertdialog"],[data-chat-overlay]')
      )
        return;
      closePanel();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closePanel]);

  if (!user || pathname === '/messages') return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-label="Messages"
        aria-expanded={open}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-vet-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vet-primary"
      >
        <MessageCircle className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-4 top-[76px] z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2">
          <ChatPanel />
        </div>
      )}
    </div>
  );
}
