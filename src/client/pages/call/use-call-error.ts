import { useEffect } from 'react';
import type { CallState } from './call-types';

export function useCallError(
  error: string | null,
  setState: (state: CallState) => void,
  setMessage: (message: string) => void
): void {
  useEffect(() => {
    if (error) {
      setState('error');
      setMessage(error);
    }
  }, [error, setState, setMessage]);
}
