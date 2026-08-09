export type SignupFormErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};
export type PasswordStrength = {
  score: number;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  barClass: string;
  labelClass: string;
  progress: number;
  weakOverride: boolean;
  overrideReason?: string;
};
