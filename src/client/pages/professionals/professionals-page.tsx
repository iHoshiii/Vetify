import { recordTermsAgreement } from '@/lib/terms-consent';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import EligibilityDialog from './_components/eligibility-dialog';
import HeroSection from './_components/hero-section';
import TermsDialog from './_components/terms-dialog';

type Step = 'closed' | 'eligibility' | 'terms';

export default function ProfessionalsPage() {
  const [step, setStep] = useState<Step>('closed');
  const navigate = useNavigate();

  // The tick is written down before the trip, because the enquiry route checks for it
  function onAgreed(): void {
    recordTermsAgreement();
    navigate('/professionals/apply');
  }

  // The dialogs reset every time they open, so a cancelled attempt leaves nothing behind
  return (
    <main className="flex h-[calc(100vh-57px)] flex-col overflow-hidden bg-[#f6fbfb]">
      <HeroSection onApply={() => setStep('eligibility')} />

      <EligibilityDialog
        open={step === 'eligibility'}
        onContinue={() => setStep('terms')}
        onCancel={() => setStep('closed')}
      />
      <TermsDialog
        open={step === 'terms'}
        onBack={() => setStep('eligibility')}
        onCancel={() => setStep('closed')}
        onAccept={onAgreed}
      />
    </main>
  );
}
