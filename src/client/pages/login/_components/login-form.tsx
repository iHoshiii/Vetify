import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/components/providers/AuthProvider';
import { loginSchema } from '@shared/schemas';
import type { LoginFormErrors } from '@/types/login';
import { loginWithEmail } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});
  const navigate = useNavigate();
  const { setSession } = useAuth();

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
      // Push the session into the provider rather than relying on the write to
      // localStorage: the navbar renders off context, and nothing re-reads
      // storage on its own.
      setSession(await loginWithEmail(parsed.data.email, parsed.data.password));
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
  );
}
