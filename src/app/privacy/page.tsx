import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Vetify',
  description: 'Privacy Policy for Vetify application',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-5 sm:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-12">
        <h1 className="mb-8 text-4xl font-black tracking-tight text-slate-900">Privacy Policy</h1>

        <div className="prose prose-slate max-w-none">
          <p className="text-lg text-slate-600">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="mt-8 mb-4 text-2xl font-bold text-slate-800">1. Information We Collect</h2>
          <p className="mb-4 text-slate-600">
            We collect information you provide directly to us when you create an account, update
            your profile, use our services, or communicate with us. This may include your name,
            email address, pet information, and any other details you choose to provide.
          </p>

          <h2 className="mt-8 mb-4 text-2xl font-bold text-slate-800">
            2. How We Use Your Information
          </h2>
          <p className="mb-4 text-slate-600">
            We use the information we collect to provide, maintain, and improve our services,
            including to:
          </p>
          <ul className="mb-4 list-disc space-y-2 pl-6 text-slate-600">
            <li>Create and manage your Vetify account.</li>
            <li>Provide personalized pet care recommendations.</li>
            <li>Send you technical notices, updates, and support messages.</li>
            <li>Respond to your comments, questions, and customer service requests.</li>
          </ul>

          <h2 className="mt-8 mb-4 text-2xl font-bold text-slate-800">3. Information Sharing</h2>
          <p className="mb-4 text-slate-600">
            We do not share your personal information with third parties except as described in this
            privacy policy, such as with vendors, consultants, and other service providers who need
            access to such information to carry out work on our behalf.
          </p>

          <h2 className="mt-8 mb-4 text-2xl font-bold text-slate-800">4. Data Security</h2>
          <p className="mb-4 text-slate-600">
            We take reasonable measures to help protect information about you from loss, theft,
            misuse, and unauthorized access, disclosure, alteration, and destruction.
          </p>

          <h2 className="mt-8 mb-4 text-2xl font-bold text-slate-800">5. Contact Us</h2>
          <p className="text-slate-600">
            If you have any questions about this Privacy Policy, please contact us at
            support@vetify.com.
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
