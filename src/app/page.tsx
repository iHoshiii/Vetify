import AboutSection from '@/components/home/about-section';
import CtaBanner from '@/components/home/CTA-banner';
import FeatureGrid from '@/components/home/feature-grid';
import Footer from '@/components/home/footer';
import HeroSection from '@/components/home/hero-section';
import HowItWorks from '@/components/home/how-it-works';
import MoreFeatures from '@/components/home/more-feature';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      <HeroSection />
      <FeatureGrid />
      <AboutSection />
      <HowItWorks />
      <MoreFeatures />
      <CtaBanner />
      <Footer />
    </main>
  );
}
