import ContactForm from './_components/contact-form';
import ContactHero from './_components/contact-hero';
import ContactInfo from './_components/contact-info';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      <ContactHero />

      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-20 sm:pb-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <ContactInfo />
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
