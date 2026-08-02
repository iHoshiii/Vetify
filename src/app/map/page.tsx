import InfoCards from './_components/info-cards';
import InteractiveMap from './_components/interactive-map/map-official';

export default function MapPage() {
  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f6fbfb] text-slate-950 flex flex-col justify-center">
      {/* ── HERO + MAP ───────────────────────────────────────── */}
      <section className="flex items-center px-5 sm:px-10 max-w-7xl mx-auto py-8 gap-8 lg:gap-12 w-full">
        {/* LEFT — Text + Info */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Heading */}
          <div>
            <h1 className="text-4xl font-black tracking-tight leading-[1.1] text-slate-900 sm:text-5xl">
              Find a vet
              <br />
              <span className="text-blue-600">near you.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-500 max-w-md">
              Discover veterinary clinics and pet care services. Pins are sourced live from
              OpenStreetMap — click any marker for details.
            </p>
          </div>

          {/* Info cards (Static Server Component) */}
          <InfoCards />
        </div>

        {/* RIGHT — Interactive Vet Map (Client Component Boundary) */}
        <InteractiveMap />
      </section>
    </main>
  );
}
