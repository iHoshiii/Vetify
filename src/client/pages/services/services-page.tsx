import ServicesCta from './_components/services-cta';
import ServicesGrid from './_components/services-grid';
import ServicesHero from './_components/services-hero';

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      <ServicesHero />
      <ServicesGrid />
      <ServicesCta />
    </main>
  );
}
