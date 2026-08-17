import { Link, useSearchParams } from 'react-router-dom';
import LoginForm from './_components/login-form';
import SocialLogins from './_components/social-login';

/** Reason codes the OAuth callback sends back on failure. */
const OAUTH_ERRORS: Record<string, string> = {
  denied: 'You cancelled the sign-in before it finished.',
  state: 'That sign-in link expired or did not match. Please try again.',
  code: 'The provider did not return a valid authorisation code.',
  provider: 'The provider could not complete the sign-in. Please try another way.',
  session: 'We could not start your session. Please try again.',
  server: 'Something went wrong on our side. Please try again.',
};

export default function LoginPage() {
  const [params] = useSearchParams();
  const oauthError = params.get('error') === 'oauth' ? params.get('reason') : null;
  const message = oauthError ? OAUTH_ERRORS[oauthError] ?? OAUTH_ERRORS.server : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-scaleIn">
        {/* Header Section */}
        <div className="text-center animate-slideDown">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-600">Log in to your Vetify account</p>
        </div>

        {message ? (
          <p
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {message}
          </p>
        ) : null}

        {/* Form Component */}
        <LoginForm />

        {/* Social Buttons Component */}
        <SocialLogins />

        {/* Footer Link */}
        <p className="mt-8 text-center text-sm text-slate-600 animate-fadeIn delay-700">
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
