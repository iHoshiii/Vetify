import ContactHero from './_components/contact-hero';
import ContactInfo from './_components/contact-info';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      <ContactHero />

      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-8 sm:pb-24">
        <ContactInfo />
      </section>
    </main>
  );
}
