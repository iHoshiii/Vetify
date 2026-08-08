export default function ContactInfo() {
  return (
    <div className="flex flex-col justify-center">
      <h2 className="text-3xl font-bold tracking-tight text-slate-950 mb-8">Reach out directly</h2>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-bold text-slate-900">General Support</h3>
          <p className="mt-2 text-slate-600 leading-relaxed">
            Having trouble with your account or a specific feature? Our support team is ready to
            assist you during business hours.
          </p>
          <a
            href="mailto:support@vetify.com"
            className="mt-3 inline-block font-semibold text-teal-700 hover:text-teal-800 hover:underline underline-offset-4"
          >
            support@vetify.com
          </a>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">Professional Partnerships</h3>
          <p className="mt-2 text-slate-600 leading-relaxed">
            Are you a licensed veterinarian looking to join the platform? Let&apos;s talk about how
            we can work together.
          </p>
          <a
            href="mailto:partners@vetify.com"
            className="mt-3 inline-block font-semibold text-teal-700 hover:text-teal-800 hover:underline underline-offset-4"
          >
            partners@vetify.com
          </a>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">Media & Press</h3>
          <p className="mt-2 text-slate-600 leading-relaxed">
            For press inquiries, brand assets, or media interview requests, please reach out to our
            communications team.
          </p>
          <a
            href="mailto:press@vetify.com"
            className="mt-3 inline-block font-semibold text-teal-700 hover:text-teal-800 hover:underline underline-offset-4"
          >
            press@vetify.com
          </a>
        </div>
      </div>
    </div>
  );
}
