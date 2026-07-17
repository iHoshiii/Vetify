'use client';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { loginSchema } from '@/lib/schemas';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import React, { useState } from 'react';

type LoginFormErrors = {
  email?: string;
  password?: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: flattened.email?.[0],
        password: flattened.password?.[0],
      });
      setError('Please correct the highlighted fields.');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: true,
        callbackUrl: '/',
      });

      if (result?.error) {
        setError('Invalid email or password');
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-scaleIn">
        <div className="text-center animate-slideDown">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-600">Log in to your Vetify account</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 animate-slideUp delay-200">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm animate-shake">
              {error}
            </div>
          )}
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

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              Remember me
            </label>
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
              Forgot password?
            </a>
          </div>

          <Button
            type="submit"
            className="w-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            loading={loading}
          >
            Sign In
          </Button>
        </form>

        <div className="relative my-8 animate-fadeIn delay-400">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-500 font-medium">Or continue with</span>
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
          Don't have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
          >
            Sign up
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
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.59-1.01V14.5c.01 2.22-.5 4.56-2.09 6.19-1.61 1.66-4.13 2.32-6.32 1.88-2.25-.45-4.18-2.21-4.76-4.39-.73-2.63.29-5.69 2.49-7.26 1.48-1.07 3.43-1.46 5.21-1.07v4.1c-.88-.23-1.87-.13-2.65.34-.78.48-1.25 1.39-1.23 2.31.01 1.05.74 2.05 1.76 2.3 1.02.26 2.2-.08 2.84-.93.46-.6.67-1.38.65-2.15V.02z" />
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
