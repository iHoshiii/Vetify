import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { emailVerificationConfirmSchema } from '@shared/email-verification';
import Button from '@/components/ui/Button';
import { readAuthState, refreshSession } from '@/lib/auth';
import { confirmEmailVerification } from '@/services/email-verification.service';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import RecoveryCard from '@/pages/password-recovery/recovery-card';

export default function VerifyEmailPage() {
  const location = useLocation();
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') ?? '');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sessionNotice, setSessionNotice] = useState('');
  const valid = emailVerificationConfirmSchema.safeParse({ token }).success;
  useDocumentTitle('Verify email', 'Confirm the email address for your Vetify account.');

  useEffect(() => {
    if (window.location.hash)
      window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);

  async function confirm() {
    if (!valid || pending || message) return;
    setPending(true);
    setError('');
    try {
      const response = await confirmEmailVerification({ token });
      setMessage(response.message);
      if (readAuthState()?.user) {
        try {
          await refreshSession({ fresh: true });
        } catch {
          setSessionNotice(
            'Sign in again to refresh the verification status shown in your account.'
          );
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not verify this email address.');
    } finally {
      setPending(false);
    }
  }

  return (
    <RecoveryCard
      title="Verify your email"
      description="Click Verify email to confirm the email address linked to this verification email."
    >
      {!valid ? (
        <p role="alert">This verification link is missing or invalid. Please request a new one.</p>
      ) : message ? (
        <p role="status" className="rounded-lg bg-teal-50 p-4 text-sm text-teal-800">
          {message}
        </p>
      ) : (
        <div className="space-y-4">
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}
          <Button onClick={() => void confirm()} loading={pending} className="w-full">
            Verify email
          </Button>
        </div>
      )}
      {sessionNotice && (
        <p role="status" className="text-sm text-slate-600">
          {sessionNotice}
        </p>
      )}
      <Link
        to="/settings/profile"
        className="block text-sm font-medium text-blue-600 hover:text-blue-500"
      >
        {message ? 'Open profile settings' : 'Request a new verification link in profile settings'}
      </Link>
    </RecoveryCard>
  );
}
