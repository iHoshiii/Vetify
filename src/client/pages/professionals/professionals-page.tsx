import ConditionsSection from './_components/condition-section';
import CtaSection from './_components/cta-section';
import EligibilitySection from './_components/eligibility-section';
import HeroSection from './_components/hero-section';

export default function ProfessionalsPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      <HeroSection />
      <EligibilitySection />
      <ConditionsSection />
      <CtaSection />
    </main>
  );
}
