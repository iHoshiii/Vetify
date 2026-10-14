import { EMAIL_VERIFICATION_REQUIRED, needsEmailVerification } from '@shared/email-verification';
import type { User } from '../models/users';
import { AppError } from '../utils/AppError';

export function requireVerifiedEmail(user: User): void {
  if (needsEmailVerification(user)) {
    throw AppError.forbidden(
      'Confirm your email before using the app.',
      EMAIL_VERIFICATION_REQUIRED
    );
  }
}
