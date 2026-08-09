import { Link } from 'react-router-dom';
export default function ServicesCta() {
  return (
    <section className="bg-white py-20 border-t border-slate-100">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Still looking for answers?
        </h2>
        <p className="mt-4 text-lg text-slate-600">
          If you&apos;re not sure which tool you need, try asking our AI assistant first. It can
          point you in the right direction.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/chat"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:-translate-y-0.5"
          >
            Ask the AI
          </Link>
          <Link
            to="/contact"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}
