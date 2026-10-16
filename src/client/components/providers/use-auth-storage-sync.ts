import { useEffect } from 'react';
import {
  AUTH_CHANGE_EVENT,
  AUTH_LOGOUT_KEY,
  AUTH_STORAGE_KEY,
  readAuthState,
  type AuthState,
} from '@/lib/auth-storage';

export function useAuthStorageSync(adopt: (state: AuthState | null) => void): void {
  useEffect(() => {
    const changed = () => adopt(readAuthState());
    const storage = (event: StorageEvent) => {
      if (event.key === AUTH_LOGOUT_KEY && !window.localStorage.getItem(AUTH_STORAGE_KEY))
        window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
      if (event.key === AUTH_STORAGE_KEY || event.key === AUTH_LOGOUT_KEY || event.key === null)
        changed();
    };
    window.addEventListener(AUTH_CHANGE_EVENT, changed);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, changed);
      window.removeEventListener('storage', storage);
    };
  }, [adopt]);
}
