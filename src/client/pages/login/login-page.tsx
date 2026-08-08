import { Link } from 'react-router-dom';
import LoginForm from './components/login-form';
import SocialLogins from './components/social-login';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-scaleIn">
        {/* Header Section */}
        <div className="text-center animate-slideDown">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-600">Log in to your Vetify account</p>
        </div>

        {/* Form Component */}
        <LoginForm />

        {/* Social Buttons Component */}
        <SocialLogins />

        {/* Footer Link */}
        <p className="mt-8 text-center text-sm text-slate-600 animate-fadeIn delay-700">
          Don't have an account?{' '}
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
