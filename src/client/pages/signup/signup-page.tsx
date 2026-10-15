import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { EmailVerificationDelivery } from '@shared/email-verification';

import { useAuth } from '@/components/providers/AuthProvider';
import {
  clearAuthReturnTo,
  landingFor,
  pendingAuthReturnTo,
  readAccessToken,
  startSocialLogin,
  type AuthUser,
  type SignupSession,
} from '@/lib/auth';
import EmailVerificationForm from './_components/email-verification-form';
import SignupForm from './_components/signup-form';
import SocialLogin from './_components/social-login';
import SocialSignupNotice from './_components/social-signup-notice';

export default function SignupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, accessToken, setSession, logout } = useAuth();
  const [delivery, setDelivery] = useState<{ userId: string; info?: EmailVerificationDelivery }>();
  const from = (location.state as { from?: string } | null)?.from ?? pendingAuthReturnTo();
  const verifying = user?.provider === 'local' && !user.emailVerified;

  const finish = (confirmedUser: AuthUser) => {
    const token = readAccessToken() ?? accessToken;
    if (!token) return;
    setSession({ accessToken: token, user: confirmedUser });
    clearAuthReturnTo();
    navigate(landingFor(confirmedUser, from), { replace: true });
  };

  const signup = (session: SignupSession) => {
    setDelivery({ userId: session.user.id, info: session.emailVerification });
    setSession(session);
    if (session.user.emailVerified) finish(session.user);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-scaleIn">
        <div className="text-center animate-slideDown">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {verifying ? 'Confirm your email' : 'Create Account'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {verifying
              ? 'Enter your code to finish signing up'
              : 'Join Vetify to care for your pet'}
          </p>
        </div>

        {verifying ? (
          <>
            <EmailVerificationForm
              key={user.id}
              email={user.email}
              initialDelivery={delivery?.userId === user.id ? delivery.info : undefined}
              onVerified={finish}
            />
            <button
              type="button"
              onClick={() => void logout().then(() => navigate('/login', { replace: true }))}
              className="w-full text-sm font-semibold text-slate-600 underline underline-offset-4"
            >
              Sign out and use another account
            </button>
          </>
        ) : (
          <>
            <SocialSignupNotice />
            <SignupForm onSignup={signup} />

            <div className="relative my-8 animate-fadeIn delay-400">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500 font-medium">Or sign up with</span>
              </div>
            </div>

            <SocialLogin onLogin={(provider) => startSocialLogin(provider, from, 'signup')} />

            <p className="mt-8 text-center text-sm text-slate-600 animate-fadeIn delay-700">
              Already have an account?{' '}
              <Link
                to="/login"
                state={from ? { from } : undefined}
                className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
              >
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
