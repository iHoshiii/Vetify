import { useLocation } from 'react-router-dom';

import ChatLauncher from './messaging/ChatLauncher';
import NotificationLauncher from './notifications/NotificationLauncher';

// The floating chat and notification buttons, hidden on the full-screen call so the room shows no app chrome.
export default function FloatingLaunchers() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/call/')) return null;

  return (
    <>
      <ChatLauncher />
      <NotificationLauncher />
    </>
  );
}
