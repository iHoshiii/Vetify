import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { signupWithEmail } from '@/lib/auth';
import { signupSchema } from '@shared/schemas';

import PasswordStrengthMeter, { evaluatePasswordStrength } from './password-strength';
import type { SignupFormErrors } from '@/types/signup';

export default function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignupFormErrors>({});
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
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
      await signupWithEmail(parsed.data);
      setSuccess('Account created successfully. Redirecting you to the dashboard...');
      setPassword('');
      setConfirmPassword('');
      window.setTimeout(() => navigate('/'), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(password, email, name),
    [password, email, name]
  );

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4 animate-slideUp delay-200">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm animate-shake">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm">
          {success}
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
        <a href="#" className="text-blue-600 hover:underline transition-colors">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="#" className="text-blue-600 hover:underline transition-colors">
          Privacy Policy
        </a>
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
