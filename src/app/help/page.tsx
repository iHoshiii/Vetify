import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center | Vetify',
  description: 'Help Center and FAQs for Vetify',
};

export default function HelpCenterPage() {
  const faqs = [
    {
      question: 'How do I book an appointment?',
      answer:
        'You can book an appointment by clicking the "Book Appointment" button on the navigation bar, selecting your preferred clinic, and choosing an available time slot.',
    },
    {
      question: 'How can I edit my profile?',
      answer:
        'Navigate to your Account & Profile settings from the bottom-left menu. Click on "Profile Edit" to update your username, bio, or profile picture.',
    },
    {
      question: 'What do I do if I forget my password?',
      answer:
        'Go to the login page and click on "Forgot Password". We will send you an email with instructions on how to securely reset your password.',
    },
    {
      question: 'How do I manage my notifications?',
      answer:
        'Open the settings menu and click on the "Notifications" section. From there, you can toggle push alerts and set up specific notification preferences.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-5 sm:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-12">
        <div className="text-center mb-12">
          <h1 className="mb-4 text-4xl font-black tracking-tight text-slate-900">Help Center</h1>
          <p className="text-lg text-slate-600">How can we help you today?</p>
        </div>

        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-bold text-slate-800">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                <h3 className="mb-2 text-lg font-bold text-slate-800">{faq.question}</h3>
                <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-teal-50 p-8 text-center border border-teal-100">
          <h2 className="mb-2 text-xl font-bold text-teal-900">Still need help?</h2>
          <p className="mb-6 text-teal-700">Our support team is always ready to assist you.</p>
          <a
            href="mailto:support@vetify.com"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-600 px-6 font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-lg"
          >
            Contact Support
          </a>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
