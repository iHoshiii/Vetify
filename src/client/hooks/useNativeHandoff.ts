import { useEffect, useRef, useState } from 'react';
import { createNativeHandoff, type NativeHandoff } from '@/services/native-handoff.service';

export function useNativeHandoff(userId?: string) {
  const [handoff, setHandoff] = useState<(NativeHandoff & { userId: string }) | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const request = useRef(0);

  useEffect(() => {
    request.current += 1;
    setHandoff(null);
    setPending(false);
    setError('');
    return () => {
      request.current += 1;
    };
  }, [userId]);

  useEffect(() => {
    if (!handoff) return;
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [handoff]);

  async function generate() {
    if (!userId) return;
    const started = ++request.current;
    setPending(true);
    setHandoff(null);
    setError('');
    try {
      const result = await createNativeHandoff();
      if (started !== request.current) return;
      if (result.user.id !== userId) {
        throw new Error('Your account changed. Reload this page and generate a new QR.');
      }
      setNow(Date.now());
      setHandoff({ ...result, userId });
    } catch (cause) {
      if (started === request.current) {
        setError(cause instanceof Error ? cause.message : 'The connection could not be created.');
      }
    } finally {
      if (started === request.current) setPending(false);
    }
  }

  const current = handoff?.userId === userId ? handoff : null;
  const remaining = current
    ? Math.max(0, Math.ceil((Date.parse(current.expiresAt) - now) / 1000))
    : 0;
  return {
    url: remaining > 0 ? current?.url : undefined,
    expired: Boolean(current) && remaining === 0,
    remaining,
    pending,
    error,
    generate,
  };
}
