import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { resetPasswordSchema } from '@shared/password-recovery';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { resetPassword } from '@/lib/auth';
import RecoveryCard from './recovery-card';

export default function ResetPasswordPage() {
  const location = useLocation();
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (window.location.hash)
      window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const parsed = resetPasswordSchema.safeParse({ token, password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const response = await resetPassword(parsed.data);
      setMessage(response.message);
      setPassword('');
      setConfirmPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again in a few minutes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <RecoveryCard
      title="Choose a new password"
      description="Use at least 8 characters, including an uppercase letter, a number, and a special character."
    >
      {!token ? (
        <p role="alert">This recovery link is missing. Please request a new one.</p>
      ) : message ? (
        <p role="status" className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          {message}
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          <Button type="submit" loading={loading} className="w-full">
            Save new password
          </Button>
        </form>
      )}
      {!message && (
        <Link to="/forgot-password" className="block text-sm font-medium text-blue-600">
          Request another recovery link
        </Link>
      )}
    </RecoveryCard>
  );
}
