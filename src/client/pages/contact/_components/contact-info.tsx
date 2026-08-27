import { Link } from 'react-router-dom';

const LINK =
  'mt-3 inline-block font-semibold text-teal-700 hover:text-teal-800 hover:underline underline-offset-4';

export default function ContactInfo() {
  return (
    <div className="flex flex-col justify-center">
      <h2 className="text-3xl font-bold tracking-tight text-slate-950 mb-8">Reach out directly</h2>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-bold text-slate-900">General Support</h3>
          <p className="mt-2 text-slate-600 leading-relaxed">
            Having trouble with your account or a specific feature? Our support team is ready to
            assist you during business hours.
          </p>
          <a href="mailto:support.vetify@gmail.com" className={LINK}>
            support.vetify@gmail.com
          </a>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">Professional Partnerships</h3>
          <p className="mt-2 text-slate-600 leading-relaxed">
            Are you a licensed veterinarian looking to join the platform? Tell us about yourself and
            our team will take it from there.
          </p>
          <Link to="/professionals" className={LINK}>
            Request Application
          </Link>
        </div>
      </div>
    </div>
  );
}
