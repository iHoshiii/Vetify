'use client';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import React, { useMemo, useState } from 'react';

const PASSWORD_CRITERIA = [
  { key: 'length', label: 'At least 8 characters' },
  { key: 'uppercase', label: 'One uppercase letter' },
  { key: 'number', label: 'One number' },
  { key: 'special', label: 'One special character' },
] as const;

type PasswordCriterionKey = (typeof PASSWORD_CRITERIA)[number]['key'];

type PasswordStrength = {
  score: number;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  barClass: string;
  labelClass: string;
  progress: number;
  criteria: Record<PasswordCriterionKey, boolean>;
  weakOverride: boolean;
  overrideReason?: string;
};

function evaluatePasswordStrength(password: string, email: string, name: string): PasswordStrength {
  const normalizedPassword = password.trim();
  const normalizedLower = normalizedPassword.toLowerCase();
  const emailPrefix = email.split('@')[0].toLowerCase();
  const nameParts = name
    .toLowerCase()
    .split(/\s+/)
    .filter((part) => part.length >= 3);

  const criteria: PasswordStrength['criteria'] = {
    length: normalizedPassword.length >= 8,
    uppercase: /[A-Z]/.test(normalizedPassword),
    number: /[0-9]/.test(normalizedPassword),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(normalizedPassword),
  };

  const baseScore = Object.values(criteria).filter(Boolean).length;

  const sequentialPatterns = [
    '123',
    '234',
    '345',
    '456',
    '567',
    '678',
    '789',
    '012',
    'abc',
    'bcd',
    'cde',
    'qwerty',
    'asdf',
    'password',
    'admin',
  ];

  const sequentialDetected = sequentialPatterns.some((pattern) =>
    normalizedLower.includes(pattern)
  );
  const includesEmailPrefix = emailPrefix.length >= 3 && normalizedLower.includes(emailPrefix);
  const includesNamePart = nameParts.some((part) => normalizedLower.includes(part));
  const weakOverride = sequentialDetected || includesEmailPrefix || includesNamePart;

  const overrideReason = weakOverride
    ? sequentialDetected
      ? 'Password contains a common sequence.'
      : includesEmailPrefix
      ? 'Password includes your email username.'
      : 'Password includes part of your name.'
    : undefined;

  const score = weakOverride && baseScore > 1 ? 1 : baseScore;
  const label = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';
  const labelClass =
    score <= 1
      ? 'bg-red-100 text-red-700'
      : score === 2
      ? 'bg-amber-100 text-amber-800'
      : score === 3
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-emerald-700 text-white';
  const barClass =
    score <= 1
      ? 'bg-red-500'
      : score === 2
      ? 'bg-amber-400'
      : score === 3
      ? 'bg-emerald-300'
      : 'bg-emerald-600';

  return {
    score,
    label,
    barClass,
    labelClass,
    progress: (score / 4) * 100,
    criteria,
    weakOverride,
    overrideReason,
  };
}

function CriteriaItem({ passed, label }: { passed: boolean; label: string }) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <span
        className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border text-xs font-semibold ${
          passed
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 bg-white text-slate-400'
        }`}
        aria-hidden="true"
      >
        {passed ? '✓' : '–'}
      </span>
      <span className={passed ? 'text-slate-900' : 'text-slate-500'}>{label}</span>
    </li>
  );
}

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    // In a real app, you would call your API to create the user
    // For now, we'll just simulate a successful signup and then sign in
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await signIn('credentials', {
        email,
        password,
        redirect: true,
        callbackUrl: '/',
      });

      if (result?.error) {
        setError('Signup failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    signIn(provider, { callbackUrl: '/' });
  };

  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(password, email, name),
    [password, email, name]
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-scaleIn">
        <div className="text-center animate-slideDown">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create Account</h1>
          <p className="mt-2 text-sm text-slate-600">Join Vetify to care for your pet</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 animate-slideUp delay-200">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm animate-shake">
              {error}
            </div>
          )}
          <Input
            label="Full Name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email address"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {password && (
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Password strength</p>
                  <p className="text-xs text-slate-500">
                    Use a strong password to protect your account.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${passwordStrength.labelClass}`}
                  aria-live="polite"
                >
                  {passwordStrength.label}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${passwordStrength.barClass}`}
                  style={{ width: `${passwordStrength.progress}%` }}
                />
              </div>

              <p className="text-xs text-slate-500">Score: {passwordStrength.score} / 4</p>

              {passwordStrength.weakOverride && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {passwordStrength.overrideReason}
                </div>
              )}
            </div>
          )}

          {password && (
            <Input
              label="Re-enter password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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

        <div className="relative my-8 animate-fadeIn delay-400">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-500 font-medium">Or sign up with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 animate-slideUp delay-600">
          <Button
            variant="secondary"
            className="w-full gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => handleSocialLogin('google')}
          >
            <GoogleIcon />
            Google
          </Button>
          <Button
            variant="secondary"
            className="w-full gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => handleSocialLogin('facebook')}
          >
            <FacebookIcon />
            Facebook
          </Button>
          <Button
            variant="secondary"
            className="w-full gap-2 col-span-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => handleSocialLogin('tiktok')}
          >
            <TikTokIcon />
            TikTok
          </Button>
        </div>

        <p className="mt-8 text-center text-sm text-slate-600 animate-fadeIn delay-700">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.59-1.01V14.5c.01 2.22-.5 4.56-2.09 6.19-1.61 1.66-4.13 2.32-6.32 1.88-2.25-.45-4.18-2.21-4.76-4.39-.73-2.63.29-5.69 2.49-7.26 1.48-1.07 3.43-1.46 5.21-1.07v4.1c-.88-.23-1.87-.13-2.65.34-.78.48-1.25 1.39-1.23 2.31.01 1.05.74-2.05 1.76-2.3 1.02-.26 2.2-.08 2.84-.93.46-.6.67-1.38.65-2.15V.02z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
