import { useAuth } from '@/components/providers/AuthProvider';
import { useUnreadCount } from '@/hooks/useMessages';
import { MessageCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import ChatPanel from './ChatPanel';
import { useChatPanel } from './chat-context';

// The owner's messaging button, bottom-right, mirroring the settings tray bottom-left. Signed-in only, since a thread names two accounts.
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
    <div ref={rootRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && <ChatPanel />}
      <button
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-label="Messages"
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-teal-800 hover:shadow-xl focus:outline-none"
      >
        <MessageCircle className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
