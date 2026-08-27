import { useState } from 'react';

export default function ContactForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fullName = `${firstName} ${lastName}`.trim();
    const subject = encodeURIComponent(
      `Contact Form Message${fullName ? ` from ${fullName}` : ''}`
    );
    const body = encodeURIComponent(
      `Name: ${fullName || 'Not provided'}\nEmail: ${
        email || 'Not provided'
      }\n\nMessage:\n${message}`
    );
    window.location.href = `mailto:support.vetify@gmail.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <div className="rounded-3xl border border-teal-900/10 bg-white p-8 sm:p-10 shadow-xl shadow-slate-200/40">
      <h2 className="text-2xl font-bold text-slate-950 mb-6">Send us a message</h2>
      {submitted && (
        <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
          Your email client has been opened to send your message to support.vetify@gmail.com.
        </div>
      )}
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              placeholder="Jane"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              placeholder="Doe"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            placeholder="jane@example.com"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Message</label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            placeholder="How can we help you?"
          ></textarea>
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-slate-950 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:-translate-y-0.5 mt-2"
        >
          Send Message
        </button>
      </form>
    </div>
  );
}
