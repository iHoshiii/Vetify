export const AboutCTA = () => {
  return (
    <section className="bg-white py-20 border-t border-slate-100">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Want to learn more?
        </h2>
        <p className="mt-4 text-lg text-slate-600">
          If you share our passion for improving pet care or want to join our network of
          professionals, we&apos;d love to connect.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <a
            href="/contact"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:-translate-y-0.5"
          >
            Contact Us
          </a>
          <a
            href="/services"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5"
          >
            Explore Services
          </a>
        </div>
      </div>
    </section>
  );
};
