import { Link } from 'react-router-dom';

import { startSocialLogin } from '@/lib/auth';
import SignupForm from './_components/signup-form';
import SocialLogin from './_components/social-login';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-scaleIn">
        <div className="text-center animate-slideDown">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create Account</h1>
          <p className="mt-2 text-sm text-slate-600">Join Vetify to care for your pet</p>
        </div>

        <SignupForm />

        <div className="relative my-8 animate-fadeIn delay-400">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-500 font-medium">Or sign up with</span>
          </div>
        </div>

        <SocialLogin onLogin={startSocialLogin} />

        <p className="mt-8 text-center text-sm text-slate-600 animate-fadeIn delay-700">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
