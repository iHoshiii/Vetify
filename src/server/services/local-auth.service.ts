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

type LocalAuthOptions = { native?: boolean };

function accountExistsError(options: LocalAuthOptions) {
  return AppError.conflict(
    options.native ? 'Account already exist. Please login.' : 'User with that email already exists',
    options.native ? 'account-exists' : undefined
  );
}

export async function createLocalAccount(input: SignupInput, options: LocalAuthOptions = {}) {
  if (await findUserByEmail(input.email)) {
    throw accountExistsError(options);
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
    if (
      options.native &&
      error instanceof MongoServerError &&
      error.code === 11000 &&
      error.keyPattern?.email
    ) {
      throw accountExistsError(options);
    }
    throw error;
  }
}

export async function authenticateLocalAccount(input: LoginInput, options: LocalAuthOptions = {}) {
  const user = await findUserWithPasswordByEmail(input.email);
  if (!user && options.native) {
    throw AppError.unauthorized('Create an account first to use the app.', 'account-not-found');
  }
  if (!user || !(await comparePassword(user.password, input.password))) {
    throw AppError.unauthorized('Invalid credentials');
  }
  await requireActiveAccount(user);
  return user;
}
