import FloatingSettings from '@/components/FloatingSettings';
import ChatLauncher from '@/components/messaging/ChatLauncher';
import NotificationLauncher from '@/components/notifications/NotificationLauncher';
import { useAuth } from '@/components/providers/AuthProvider';

// Signed-in account cluster in the header: notifications, messages, and the account menu.
export function HeaderTools() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;

  return (
    <div className="flex items-center gap-1">
      <NotificationLauncher />
      <ChatLauncher />
      <FloatingSettings />
    </div>
  );
}
