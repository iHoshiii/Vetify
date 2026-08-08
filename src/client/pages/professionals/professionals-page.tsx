import ConditionsSection from './components/condition-section';
import CtaSection from './components/cta-section';
import EligibilitySection from './components/eligibility-section';
import HeroSection from './components/hero-section';

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
