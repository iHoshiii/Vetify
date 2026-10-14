import { MongoServerError } from 'mongodb';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { connectDb, disconnectDb } from '../config/db';
import { applyDnsServers } from '../config/dns';
import { env } from '../config/env';
import {
  comparePassword,
  findUserWithPasswordByEmail,
  insertUser,
  USER_INDEXES,
  usersCollection,
  type UserDocument,
} from '../models/users';

export const plannerDevelopmentAccount = {
  email: 'user@gmail.com',
  password: 'password123',
  name: 'Uma User',
} as const;

class PlannerAccountSeedError extends Error {}

function requireDevelopment() {
  if (env.NODE_ENV === 'production') {
    throw new PlannerAccountSeedError('Development account seeding cannot run in production.');
  }
}

async function verifyExisting(user: UserDocument) {
  if (
    user.role !== 'user' ||
    user.provider !== 'local' ||
    user.status !== 'active' ||
    !(await comparePassword(user.password, plannerDevelopmentAccount.password))
  ) {
    throw new PlannerAccountSeedError(
      'The dummy email already belongs to a different or unavailable account. It was left unchanged.'
    );
  }
  return { created: false, userId: user._id.toHexString() };
}

export async function seedPlannerAccount() {
  requireDevelopment();
  const existing = await findUserWithPasswordByEmail(plannerDevelopmentAccount.email);
  if (existing) return verifyExisting(existing);
  try {
    const user = await insertUser({
      ...plannerDevelopmentAccount,
      provider: 'local',
      role: 'user',
      status: 'active',
      emailVerified: true,
    });
    return { created: true, userId: user._id.toHexString() };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000 && error.keyPattern?.email) {
      const winner = await findUserWithPasswordByEmail(plannerDevelopmentAccount.email);
      if (winner) return verifyExisting(winner);
    }
    throw error;
  }
}

export async function runPlannerAccountSeed() {
  try {
    requireDevelopment();
    applyDnsServers(env.DNS_SERVERS);
    if (!(await connectDb())) {
      throw new PlannerAccountSeedError('Vetify account database is unavailable.');
    }
    await usersCollection().createIndexes(USER_INDEXES);
    return await seedPlannerAccount();
  } finally {
    await disconnectDb();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void runPlannerAccountSeed()
    .then(({ created }) => {
      console.log(
        `[seed:account] ${created ? 'Created' : 'Reused'} Vetify's dummy consumer account: ${
          plannerDevelopmentAccount.email
        }`
      );
    })
    .catch((error: unknown) => {
      console.error(
        `[seed:account] ${
          error instanceof PlannerAccountSeedError
            ? error.message
            : 'Could not prepare the dummy account. Check Vetify database connectivity and permissions.'
        }`
      );
      process.exitCode = 1;
    });
}
