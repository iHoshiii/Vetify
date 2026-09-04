// The applicant's tick, kept where the trip through /login cannot lose it. Presentation,
// not enforcement: devtools can write the key, but a typed URL no longer walks past the gate.
const CONSENT_KEY = 'vetify.professionals.termsAgreed';

// Kept in the tab as well, so a tab that refuses storage cannot bounce off the gate forever
let agreedInThisTab = false;

export function recordTermsAgreement(): void {
  agreedInThisTab = true;
  try {
    window.sessionStorage.setItem(CONSENT_KEY, new Date().toISOString());
  } catch {
    // Storage refused, so the flag above is all the gate has to read
  }
}

export function hasAgreedToTerms(): boolean {
  if (agreedInThisTab) return true;
  try {
    return Boolean(window.sessionStorage.getItem(CONSENT_KEY));
  } catch {
    return false;
  }
}

export function forgetTermsAgreement(): void {
  agreedInThisTab = false;
  try {
    window.sessionStorage.removeItem(CONSENT_KEY);
  } catch {
    // Nothing was stored to clear
  }
}
