import { useSearchParams } from 'react-router-dom';

const messages: Record<string, string> = {
  'account-exists-google':
    'This Google account is already connected to Vetify. Please log in with Google.',
  'account-exists-facebook':
    'This Facebook account is already connected to Vetify. Please log in with Facebook.',
  'account-exists-tiktok':
    'This TikTok account is already connected to Vetify. Please log in with TikTok.',
  'account-exists': 'Account already exists. Please log in using your existing sign-in method.',
  'signup-required':
    'This provider did not share an email address. Create an account using email and password, then connect this sign-in method in Settings > Security.',
  denied: 'You cancelled signup before it finished. Please try again.',
  state: 'That signup link expired or did not match. Please try again.',
  unconfigured: 'This sign-up method is not available yet. Please try another way.',
  blocked: 'This account cannot sign in. Please contact Vetify support.',
};

export default function SocialSignupNotice() {
  const [params] = useSearchParams();
  if (params.get('error') !== 'oauth') return null;
  const message =
    messages[params.get('reason') ?? ''] ?? 'We could not complete signup. Please try again.';
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </p>
  );
}
