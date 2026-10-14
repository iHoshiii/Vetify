import { useState, type FormEvent } from 'react';
import { forgotPasswordSchema } from '@shared/password-recovery';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { requestPasswordRecovery } from '@/lib/auth';
import RecoveryCard from './recovery-card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const response = await requestPasswordRecovery(parsed.data.email);
      setMessage(response.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again in a few minutes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <RecoveryCard
      title="Forgot your password?"
      description="Enter the email you use for Vetify. We will send you a link to choose a new password."
    >
      {message ? (
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
            label="Email address"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Button type="submit" loading={loading} className="w-full">
            Send recovery link
          </Button>
        </form>
      )}
    </RecoveryCard>
  );
}
