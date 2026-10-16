import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import type { AccountLinkMethod } from '@shared/account-auth';
import type { EmailVerificationDelivery } from '@shared/email-verification';
import VerificationCodeInput from '@/pages/signup/_components/verification-code-input';
import {
  requestAccountLinkCode,
  verifyAccountLinkCode,
  openAccountAuthUrl,
} from '@/services/account-auth.service';
import { accountAuthError, LOGIN_METHOD_NAMES } from './account-auth-feedback';
import { LINK_METHOD_BUTTON } from './link-method-styles';

type Props = {
  method: AccountLinkMethod;
  email: string;
  onVerified: () => void;
  onClose: () => void;
};
export default function LinkMethodCodeForm({ method, email, onVerified, onClose }: Props) {
  const [delivery, setDelivery] = useState<EmailVerificationDelivery>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(true);
  const requested = useRef(false);
  const active = useRef(true);
  useLayoutEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const cooldown = delivery
    ? Math.max(0, Math.ceil((Date.parse(delivery.resendAvailableAt) - now) / 1000))
    : 0;
  const expired = Boolean(delivery && Date.parse(delivery.expiresAt) <= now);
  const send = useCallback(async () => {
    setPending(true);
    setError('');
    try {
      setDelivery(await requestAccountLinkCode(method));
      setCode('');
      setNow(Date.now());
    } catch (cause) {
      setError(
        accountAuthError(cause, 'We could not send the verification email. Please try again.')
      );
    } finally {
      setPending(false);
    }
  }, [method]);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void send();
  }, [send]);
  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[0-9]{6}$/.test(code)) return;
    setPending(true);
    setError('');
    try {
      const result = await verifyAccountLinkCode(method, code);
      if (!active.current) return;
      if (result.url) openAccountAuthUrl(result.url);
      else onVerified();
    } catch (cause) {
      setError(accountAuthError(cause, 'We could not verify your code. Please try again.'));
      setPending(false);
    }
  };
  return (
    <form
      onSubmit={(event) => void verify(event)}
      className="space-y-4 bg-white"
      aria-label={`Link ${LOGIN_METHOD_NAMES[method]}`}
    >
      <p className="text-sm text-slate-600">
        {delivery?.sent
          ? 'We sent a verification code to'
          : delivery
          ? 'We could not send a verification code to'
          : 'Verify your email to link'}{' '}
        <span className="break-all font-semibold text-slate-900">{email}</span>.
      </p>
      {method !== 'local' && (
        <p className="text-sm text-slate-600">
          After verifying your email, sign in with {LOGIN_METHOD_NAMES[method]} to finish linking.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {delivery && (
        <>
          <VerificationCodeInput value={code} onChange={setCode} disabled={pending} />
          <p role="status" className="text-xs text-slate-500">
            {expired
              ? 'This code has expired. Send a new code.'
              : 'This code is valid for five minutes. Check your inbox and spam folder.'}
          </p>
          <button
            type="submit"
            disabled={pending || expired || !/^[0-9]{6}$/.test(code)}
            className={LINK_METHOD_BUTTON}
          >
            {pending
              ? 'Verifying...'
              : method === 'local'
              ? 'Verify email'
              : `Verify and continue with ${LOGIN_METHOD_NAMES[method]}`}
          </button>
        </>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || cooldown > 0}
          onClick={() => void send()}
          className={LINK_METHOD_BUTTON}
        >
          {cooldown > 0
            ? `Resend code in ${cooldown}s`
            : delivery
            ? 'Resend code'
            : 'Send verification code'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onClose}
          className="px-3 py-2 text-sm font-semibold text-slate-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
