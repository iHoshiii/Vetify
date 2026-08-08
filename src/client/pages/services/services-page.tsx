import ServicesCta from './components/services-cta';
import ServicesGrid from './components/services-grid';
import ServicesHero from './components/services-hero';

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      <ServicesHero />
      <ServicesGrid />
      <ServicesCta />
    </main>
  );
}
