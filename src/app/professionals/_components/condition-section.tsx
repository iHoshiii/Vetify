import { conditions } from '@/types/professional';

export default function ConditionsSection() {
  return (
    <section className="bg-[#f6fbfb] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-14 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
            Platform rules
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Terms &amp; Conditions
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
            By joining as a professional, you agree to abide by the following platform conditions.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {conditions.map((item) => (
            <div
              key={item.num}
              className="rounded-2xl border border-teal-900/10 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-sm font-black text-white shadow">
                {item.num}
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-950">{item.title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
