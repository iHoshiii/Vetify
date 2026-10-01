import ServicesCta from './_components/services-cta';
import ServicesGrid from './_components/services-grid';
import ServicesHero from './_components/services-hero';

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-vet-bg text-vet-ink">
      <ServicesHero />
      <ServicesGrid />
      <ServicesCta />
    </main>
  );
}
