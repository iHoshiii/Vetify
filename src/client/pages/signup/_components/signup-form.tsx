import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { signupWithEmail, type SignupSession } from '@/lib/auth';
import { signupSchema } from '@shared/schemas';

import PasswordStrengthMeter, { NO_PASSWORD, evaluatePasswordStrength } from './password-strength';
import type { PasswordStrength, SignupFormErrors } from '@/types/signup';

export default function SignupForm({ onSignup }: { onSignup: (session: SignupSession) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignupFormErrors>({});
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>(NO_PASSWORD);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    const parsed = signupSchema.safeParse({ name, email, password, confirmPassword });

    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        name: flattened.name?.[0],
        email: flattened.email?.[0],
        password: flattened.password?.[0],
        confirmPassword: flattened.confirmPassword?.[0],
      });
      setError('Please correct the highlighted fields.');
      setLoading(false);
      return;
    }

    try {
      const session = await signupWithEmail(parsed.data);
      setPassword('');
      setConfirmPassword('');
      onSignup(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let stale = false;

    void evaluatePasswordStrength(password, email, name).then((next) => {
      if (!stale) setPasswordStrength(next);
    });

    return () => {
      stale = true;
    };
  }, [password, email, name]);

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4 animate-slideUp delay-200">
      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm animate-shake"
        >
          {error}
        </div>
      )}
      <Input
        label="Full Name"
        type="text"
        placeholder="John Doe"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name}
        required
      />
      <Input
        label="Email address"
        type="email"
        placeholder="name@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        required
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        required
      />

      {password && <PasswordStrengthMeter strength={passwordStrength} />}

      {password && (
        <Input
          label="Re-enter password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          required
        />
      )}

      <p className="text-xs text-slate-500 mt-2">
        By signing up, you agree to our{' '}
        <Link to="/terms" className="text-blue-600 hover:underline transition-colors">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link to="/privacy" className="text-blue-600 hover:underline transition-colors">
          Privacy Policy
        </Link>
        .
      </p>

      <Button
        type="submit"
        className="w-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        loading={loading}
      >
        Create Account
      </Button>
    </form>
  );
}
