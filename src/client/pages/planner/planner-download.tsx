import { ArrowDown, Download, PawPrint, QrCode, Smartphone } from 'lucide-react';
import { plannerDownload } from './planner-content';

export default function PlannerDownload() {
  return (
    <section
      aria-labelledby="planner-title"
      className="relative overflow-hidden border-b border-teal-900/10 bg-gradient-to-br from-[#edf8f5] via-[#f8fbf8] to-[#e5f2ef]"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[340px_1fr] xl:gap-20 xl:py-20">
        <div className="mx-auto w-full max-w-[340px] rounded-[2rem] border border-white bg-white/90 p-7 text-center shadow-[0_16px_60px_-24px_rgba(15,118,110,0.3)]">
          <div className="mx-auto mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <Smartphone size={23} aria-hidden="true" />
          </div>
          <p className="text-lg font-bold text-slate-950">Take the planner with you</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your app download QR will appear here.
          </p>
          {plannerDownload.qrImageSrc ? (
            <img
              src={plannerDownload.qrImageSrc}
              alt="Scan to download the Vetify Meal Planner app"
              className="mx-auto mt-6 h-44 w-44 object-contain"
            />
          ) : (
            <div
              role="img"
              aria-label="App download QR code placeholder"
              className="mx-auto mt-6 flex h-44 w-44 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-teal-200 bg-[#f5faf8] text-teal-700"
            >
              <QrCode size={52} strokeWidth={1.25} aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700/70">
                QR code coming soon
              </span>
            </div>
          )}
          {plannerDownload.url ? (
            <a
              href={plannerDownload.url}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white hover:bg-teal-800"
            >
              <Download size={17} aria-hidden="true" />
              Download the app
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
            >
              <Download size={17} aria-hidden="true" />
              Download link coming soon
            </button>
          )}
        </div>
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-teal-800">
            <PawPrint size={14} aria-hidden="true" />
            Vetify Meal Planner
          </span>
          <h1
            id="planner-title"
            className="mt-6 text-4xl font-black leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.5rem]"
          >
            A simpler feeding routine.
            <span className="mt-2 block text-teal-700">Right in your pocket.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-slate-600 lg:mx-0">
            Meet the Vetify Meal Planner app. Keep your pets’ profiles, meal plans and daily feeding
            records together, wherever the day takes you.
          </p>
          <p className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-teal-800 lg:justify-start">
            <Smartphone size={17} aria-hidden="true" />
            Made for your mobile routine
          </p>
          <a
            href="#app-highlights"
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-slate-700 underline decoration-teal-300 underline-offset-4"
          >
            Take a look inside
            <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
