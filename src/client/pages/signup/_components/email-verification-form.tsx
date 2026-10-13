import { useEffect, useState, type FormEvent } from 'react';
import type { EmailVerificationDelivery } from '@shared/email-verification';

import Button from '@/components/ui/Button';
import { resendEmailVerification, verifyEmail, type AuthUser } from '@/lib/auth';
import { ApiError } from '@/services/api';
import VerificationCodeInput from './verification-code-input';

type Props = {
  email: string;
  initialDelivery?: EmailVerificationDelivery;
  onVerified: (user: AuthUser) => void;
};

export default function EmailVerificationForm({ email, initialDelivery, onVerified }: Props) {
  const [delivery, setDelivery] = useState(initialDelivery);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<'verify' | 'resend' | null>(null);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = delivery ? Math.max(0, Date.parse(delivery.expiresAt) - now) : null;
  const expired = remaining === 0;
  const minutes = Math.ceil((remaining ?? 0) / 60000);
  const cooldown = delivery
    ? Math.max(0, Math.ceil((Date.parse(delivery.resendAvailableAt) - now) / 1000))
    : 0;

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from your email.');
      return;
    }
    setPending('verify');
    setError('');
    try {
      const result = await verifyEmail(code);
      onVerified(result.user);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status < 500
          ? cause.message
          : 'We could not confirm your email. Please try again.'
      );
    } finally {
      setPending(null);
    }
  };

  const resend = async () => {
    setPending('resend');
    setError('');
    try {
      setDelivery(await resendEmailVerification());
      setCode('');
      setNow(Date.now());
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status < 500
          ? cause.message
          : 'We could not send the confirmation email. Please try again later.'
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <form onSubmit={confirm} className="space-y-4">
      <div role="status" className="space-y-2 text-sm text-slate-600">
        <p>
          {delivery?.sent
            ? 'We sent a six-digit confirmation code to'
            : delivery
            ? "We couldn't send the confirmation email to"
            : 'Send a six-digit confirmation code to'}{' '}
          <span className="font-semibold text-slate-900 break-all">{email}</span>.
        </p>
        {delivery?.sent && <p>Check your inbox and spam folder.</p>}
        {delivery && !delivery.sent && <p>Please try sending a code again.</p>}
        {delivery?.sent && (
          <p>
            {expired
              ? 'Your code has expired. Request a new code below.'
              : `Your code expires in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`}
          </p>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600"
        >
          {error}
        </p>
      )}
      <VerificationCodeInput
        value={code}
        onChange={setCode}
        describedBy="email-code-help"
        disabled={pending !== null}
      />
      <p id="email-code-help" className="text-xs text-slate-500">
        Enter all six digits, including any leading zero.
      </p>
      <Button
        type="submit"
        className="w-full"
        loading={pending === 'verify'}
        disabled={pending !== null || expired || !/^[0-9]{6}$/.test(code)}
      >
        Confirm email
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={resend}
        loading={pending === 'resend'}
        disabled={pending !== null || cooldown > 0}
      >
        {cooldown > 0 ? `Resend code in ${cooldown}s` : delivery ? 'Resend code' : 'Send code'}
      </Button>
    </form>
  );
}
