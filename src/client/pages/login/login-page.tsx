import { Link, useLocation, useSearchParams } from 'react-router-dom';
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

/** Friendly phrasing for the pages sitting behind RequireAuth. */
const GATED_PAGES: Record<string, string> = {
  '/book-appointment': 'book an appointment',
  '/map': 'find nearby vets',
  '/planner': 'use the meal planner',
  '/professionals/apply': 'apply to join as a professional',
};

export default function LoginPage() {
  const [params] = useSearchParams();
  const location = useLocation();

  const oauthError = params.get('error') === 'oauth' ? params.get('reason') : null;
  const oauthMessage = oauthError ? OAUTH_ERRORS[oauthError] ?? OAUTH_ERRORS.server : null;

  // The chat page links here with a query flag; RequireAuth uses router state.
  const quotaMessage =
    params.get('reason') === 'chat-quota'
      ? 'You have used your free questions for today. Log in to keep chatting with the assistant.'
      : null;

  const from = (location.state as { from?: string } | null)?.from;
  const gatedAction = from ? GATED_PAGES[from.split('?')[0]] : undefined;
  const gatedMessage = from
    ? gatedAction
      ? `Please log in to ${gatedAction}.`
      : 'Please log in to continue.'
    : null;

  const notice = oauthMessage ?? quotaMessage ?? gatedMessage;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-scaleIn">
        {/* Header Section */}
        <div className="text-center animate-slideDown">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-600">Log in to your Vetify account</p>
        </div>

        {notice ? (
          <p
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {notice}
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
