import type { LoginInput, SignupInput } from '@shared/schemas';
import { MongoServerError } from 'mongodb';
import {
  comparePassword,
  findUserByEmail,
  findUserWithPasswordByEmail,
  insertUser,
  type User,
} from '../models/users';
import { AppError } from '../utils/AppError';
import { blockedMessage, currentStatus } from './user-status.service';

export async function requireActiveAccount(user: User) {
  const status = await currentStatus(user);
  if (status !== 'active') {
    throw AppError.forbidden(blockedMessage(status), `account-${status}`);
  }
  user.status = status;
}

function accountExistsError() {
  return AppError.conflict('Account already exist. Please login', 'account-exists');
}

export async function createLocalAccount(input: SignupInput) {
  if (await findUserByEmail(input.email)) {
    throw accountExistsError();
  }
  try {
    return await insertUser({
      name: input.name,
      email: input.email,
      password: input.password,
      provider: 'local',
    });
  } catch (error) {
    // A second registration can insert this email after the existence check.
    if (error instanceof MongoServerError && error.code === 11000 && error.keyPattern?.email) {
      throw accountExistsError();
    }
    throw error;
  }
}

export async function authenticateLocalAccount(input: LoginInput) {
  const user = await findUserWithPasswordByEmail(input.email);
  if (!user) {
    throw AppError.unauthorized('Create an account first to use the app.', 'account-not-found');
  }
  if (!(await comparePassword(user.password, input.password))) {
    throw AppError.unauthorized('Invalid credentials');
  }
  await requireActiveAccount(user);
  return user;
}
