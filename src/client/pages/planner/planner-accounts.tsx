import { ArrowUpRight, KeyRound, Link2, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  {
    icon: UserRound,
    title: 'Already with Vetify?',
    text: 'Use the same Vetify account in the Meal Planner app. You do not need to create a second account.',
  },
  {
    icon: KeyRound,
    title: 'Use your usual sign-in method',
    text: 'If you joined with Google, choose Google. If you use email and a password, use those details. Connect another method in Vetify’s security settings before switching.',
  },
  {
    icon: Link2,
    title: 'Keep your account connected',
    text: 'Once the app is installed, you can also open Settings → Connect meal planner to use your personal account connection QR.',
  },
];

export default function PlannerAccounts() {
  return (
    <section
      aria-labelledby="planner-account-title"
      className="border-y border-teal-900/10 bg-[#f2f8f5]"
    >
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
            Familiar from the first sign-in
          </p>
          <h2
            id="planner-account-title"
            className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl"
          >
            One Vetify account.
            <br />A little more everyday care.
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-600">
            Your Vetify account is your starting point. The Meal Planner app is where you keep your
            pets’ meals, feeding records and nutrition observations.
          </p>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-teal-900/10 bg-white/90 p-6">
              <span className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Icon size={20} aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-7 rounded-2xl border border-teal-200/70 bg-white/60 p-5 text-sm leading-7 text-slate-600">
          <strong className="font-semibold text-teal-900">Two QRs, two purposes.</strong> The QR at
          the top of this page is for downloading the app. Your private connection QR is in Settings
          and is only for connecting your account.
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-bold text-white hover:bg-teal-800"
          >
            Create a Vetify account
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <Link
            to="/settings/meal-planner"
            className="font-semibold text-teal-800 underline underline-offset-4"
          >
            Connect an existing account
          </Link>
        </div>
      </div>
    </section>
  );
}
