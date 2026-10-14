import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { refreshSession } from '@/lib/auth';
import { writeAuthState } from '@/lib/auth-storage';
import { ApiError } from '@/services/api';

export function useSocketSession(accessToken: string | null): void {
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !accessToken) return;
    let disposed = false;
    const renew = () => {
      void refreshSession().catch((error) => {
        if (
          !disposed &&
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          writeAuthState(null);
        }
      });
    };
    const ended = ({ reason }: { reason: string }) => {
      if (reason === 'expired') renew();
      else writeAuthState(null);
    };
    socket.on('session:renew-needed', renew);
    socket.on('session:ended', ended);
    return () => {
      disposed = true;
      socket.off('session:renew-needed', renew);
      socket.off('session:ended', ended);
    };
  }, [accessToken]);
}
