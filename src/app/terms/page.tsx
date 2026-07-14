import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Vetify',
  description: 'Terms and Conditions for using the Vetify application',
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-5 sm:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-12">
        <h1 className="mb-8 text-4xl font-black tracking-tight text-slate-900">
          Terms and Conditions
        </h1>

        <div className="prose prose-slate max-w-none">
          <p className="text-lg text-slate-600">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="mt-8 mb-4 text-2xl font-bold text-slate-800">1. Acceptance of Terms</h2>
          <p className="mb-4 text-slate-600">
            By accessing or using the Vetify application, you agree to be bound by these Terms and
            Conditions. If you disagree with any part of these terms, you may not access the
            service.
          </p>

          <h2 className="mt-8 mb-4 text-2xl font-bold text-slate-800">2. User Accounts</h2>
          <p className="mb-4 text-slate-600">
            When you create an account with us, you must provide accurate, complete, and current
            information at all times. Failure to do so constitutes a breach of the terms, which may
            result in immediate termination of your account on our service.
          </p>

          <h2 className="mt-8 mb-4 text-2xl font-bold text-slate-800">3. Intellectual Property</h2>
          <p className="mb-4 text-slate-600">
            The service and its original content, features, and functionality are and will remain
            the exclusive property of Vetify and its licensors. The service is protected by
            copyright, trademark, and other laws of both the United States and foreign countries.
          </p>

          <h2 className="mt-8 mb-4 text-2xl font-bold text-slate-800">4. Termination</h2>
          <p className="mb-4 text-slate-600">
            We may terminate or suspend your account immediately, without prior notice or liability,
            for any reason whatsoever, including without limitation if you breach the Terms. Upon
            termination, your right to use the service will immediately cease.
          </p>

          <h2 className="mt-8 mb-4 text-2xl font-bold text-slate-800">
            5. Limitation of Liability
          </h2>
          <p className="mb-4 text-slate-600">
            In no event shall Vetify, nor its directors, employees, partners, agents, suppliers, or
            affiliates, be liable for any indirect, incidental, special, consequential or punitive
            damages, including without limitation, loss of profits, data, use, goodwill, or other
            intangible losses, resulting from your access to or use of or inability to access or use
            the service.
          </p>

          <h2 className="mt-8 mb-4 text-2xl font-bold text-slate-800">6. Changes</h2>
          <p className="mb-4 text-slate-600">
            We reserve the right, at our sole discretion, to modify or replace these Terms at any
            time. What constitutes a material change will be determined at our sole discretion.
          </p>
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
