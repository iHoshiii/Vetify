import type { LoginInput, SignupInput } from '@shared/schemas';
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

export async function createLocalAccount(input: SignupInput) {
  if (await findUserByEmail(input.email)) {
    throw AppError.conflict('User with that email already exists');
  }
  return insertUser({
    name: input.name,
    email: input.email,
    password: input.password,
    provider: 'local',
  });
}

export async function authenticateLocalAccount(input: LoginInput) {
  const user = await findUserWithPasswordByEmail(input.email);
  if (!user || !(await comparePassword(user.password, input.password))) {
    throw AppError.unauthorized('Invalid credentials');
  }
  await requireActiveAccount(user);
  return user;
}
