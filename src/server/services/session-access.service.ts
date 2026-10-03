import { findUserById, type User } from '../models/users';
import { isValidObjectId } from '../models/object-id';
import { AppError } from '../utils/AppError';
import { blockedMessage, currentStatus } from './user-status.service';

export async function activeSessionUser(userId: string, sessionVersion?: number): Promise<User> {
  if (!isValidObjectId(userId)) {
    throw AppError.unauthorized(
      'Your session is no longer valid. Please sign in again.',
      'bad-subject'
    );
  }
  const user = await findUserById(userId);
  if (!user) {
    throw AppError.unauthorized(
      'Your session is no longer valid. Please sign in again.',
      'no-account'
    );
  }
  const status = await currentStatus(user);
  if (status !== 'active') throw AppError.forbidden(blockedMessage(status), `account-${status}`);
  if (sessionVersion !== undefined && (user.sessionVersion ?? 0) !== sessionVersion) {
    throw AppError.unauthorized(
      'Your session is no longer valid. Please sign in again.',
      'session-revoked'
    );
  }
  return user;
}
