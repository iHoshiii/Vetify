import { Mail, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';

const CARD = 'rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm';
const ICON =
  'mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700';

export default function ContactInfo() {
  return (
    <div>
      <h2 className="text-center text-xl font-bold tracking-tight text-slate-950">
        Reach out directly
      </h2>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className={CARD}>
          <div className={ICON}>
            <Mail className="h-5 w-5" aria-hidden />
          </div>
          <h3 className="text-base font-bold text-slate-900">General Support</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Having trouble with your account or a specific feature? Our support team is ready to
            assist you during business hours.
          </p>
          <a
            href="mailto:support.vetify@gmail.com"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-900"
          >
            support.vetify@gmail.com
          </a>
        </div>

        <div className={CARD}>
          <div className={ICON}>
            <Stethoscope className="h-5 w-5" aria-hidden />
          </div>
          <h3 className="text-base font-bold text-slate-900">Professional Partnerships</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Are you a licensed veterinarian looking to join the platform? Tell us about yourself and
            our team will take it from there.
          </p>
          <Link
            to="/professionals"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
          >
            Request Application
          </Link>
        </div>
      </div>
    </div>
  );
}
