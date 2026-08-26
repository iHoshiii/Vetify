export type SignupFormErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

/**
 * A password as zxcvbn reads it, plus what the meter needs to draw that.
 *
 * `score` is zxcvbn's own 0-4 and is the number everything else here derives
 * from. Four labels over five scores on purpose: 0 and 1 are both "weak", and
 * telling somebody their password is very slightly less terrible than terrible is
 * not feedback they can act on.
 */
export type PasswordStrength = {
  score: number;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  barClass: string;
  labelClass: string;
  progress: number;
  /**
   * The one thing to fix, from zxcvbn: its warning if it has one, otherwise its
   * first suggestion. Absent for a password it has nothing to say about.
   */
  advice?: string;
  /** How long a slow offline attack would take, in words. */
  crackTime: string;
};
