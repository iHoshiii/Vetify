/**
 * Creates the three local development accounts, one per role.
 *
 *   npm run seed:accounts
 *
 *   admin@gmail.com  admin
 *   prof@gmail.com   professional, with a verified application behind it
 *   user@gmail.com   user
 *
 * All three share one password so the three roles can be compared without
 * keeping notes, which is also why this refuses to run with NODE_ENV=production:
 * a published password on an admin account is not a seed, it is a back door. Set
 * SEED_ACCOUNTS_PASSWORD if the database is shared with anybody.
 *
 * Re-runnable, and re-running is the recovery path: an account that already
 * exists has its password reset and its role, status and verification put back to
 * what this script promises. That is a reset rather than a skip on purpose - a
 * seed account you suspended while testing the ban button is otherwise one you
 * cannot sign in to again.
 */
import { connectDb, disconnectDb } from '../config/db';
import { applyDnsServers } from '../config/dns';
import { env, isProduction } from '../config/env';
import {
  ensureIndexes,
  findProfessionalByUser,
  findUserByEmail,
  hashPassword,
  insertProfessional,
  insertUser,
  normalizeEmail,
  recordAudit,
  updateProfessional,
  updateUser,
  usersCollection,
  type ProfessionalAttrs,
  type User,
  type UserRole,
} from '../models';

const DEFAULT_PASSWORD = 'password123';
const PASSWORD = process.env.SEED_ACCOUNTS_PASSWORD ?? DEFAULT_PASSWORD;

type AccountSpec = { email: string; name: string; role: UserRole };

const ACCOUNTS: AccountSpec[] = [
  { email: 'admin@gmail.com', name: 'Ada Admin', role: 'admin' },
  { email: 'prof@gmail.com', name: 'Dr Pia Prado', role: 'professional' },
  { email: 'user@gmail.com', name: 'Uma User', role: 'user' },
];

/**
 * The application behind the professional account.
 *
 * Plausible rather than placeholder: the admin queue renders these fields, and a
 * row of "test test test" tells you nothing about whether the screen reads well.
 */
const APPLICATION: Omit<ProfessionalAttrs, 'user'> = {
  licenseNumber: 'PRC-SEED-0001',
  licenseAuthority: 'Professional Regulation Commission',
  credentialUrls: ['https://example.com/seed-licence.pdf'],
  specialties: ['Small animal medicine', 'Dermatology'],
  clinicName: 'Seed Street Veterinary Clinic',
  clinicAddress: '12 Seed Street, Quezon City, Metro Manila',
  bio: 'Small animal vet seeded for local development. Eight years in general practice, mostly dogs and cats, with a soft spot for skin cases nobody else wants.',
  yearsExperience: 8,
  status: 'pending',
  backgroundCheckConsent: true,
};

/**
 * Leaves a privileged role in the audit log with a null actor.
 *
 * Same shape as the grant `seed:admin` records, and for the same reason: nobody
 * can be held to account for a role handed out by a CLI script, so the record
 * that it came from the CLI at all is what separates a deliberate seed from
 * somebody quietly promoting themselves later.
 */
async function noteGrant(user: User, from: UserRole | null): Promise<void> {
  await recordAudit({
    action: 'user.role.changed',
    targetType: 'user',
    targetId: user._id,
    actor: null,
    reason: 'seeded by seed:accounts',
    metadata: { from, to: user.role, source: 'cli' },
  });
}

/**
 * Creates the account, or brings an existing one back to the promised state.
 *
 * The password write goes through the collection rather than `updateUser`,
 * because `UserPatch` has no password field - nothing on the request path may set
 * a hash directly, and this script is not on the request path. It still hashes
 * with the same function signup uses, so the stored form is identical.
 */
async function upsertAccount(spec: AccountSpec): Promise<{ user: User; created: boolean }> {
  const email = normalizeEmail(spec.email);
  const existing = await findUserByEmail(email);

  if (!existing) {
    const user = await insertUser({
      email,
      password: PASSWORD,
      name: spec.name,
      provider: 'local',
      role: spec.role,
      status: 'active',
      // Nobody is clicking a verification link in an inbox that does not exist.
      emailVerified: true,
    });

    if (user.role !== 'user') await noteGrant(user, null);
    return { user, created: true };
  }

  await usersCollection().updateOne(
    { _id: existing._id },
    { $set: { password: await hashPassword(PASSWORD), updatedAt: new Date() } }
  );

  const user = await updateUser(existing._id, {
    name: existing.name ?? spec.name,
    role: spec.role,
    status: 'active',
    statusReason: null,
    statusChangedBy: null,
    statusChangedAt: null,
    emailVerified: true,
  });

  if (!user) throw new Error(`${email} disappeared while being seeded`);

  // Only a move to a privileged role is a grant worth logging; arriving at the
  // default role is what every signup does.
  if (user.role !== existing.role && user.role !== 'user') {
    await noteGrant(user, existing.role ?? null);
  }

  return { user, created: false };
}

/**
 * Gives the professional account the application its role implies.
 *
 * A `professional` with no application is a state the app itself cannot produce -
 * the role is what approving an application grants - and without the row
 * `GET /professionals/me` 404s and the public directory is empty, so the seeded
 * vet would be a badge and nothing else.
 *
 * Filed then approved, rather than inserted as verified, so `reviewedAt` is
 * stamped by the same repository path the admin queue uses instead of by hand
 * here. An application already on file is left alone: it may be mid-test.
 */
async function ensureApplication(vet: User, reviewer: User | null): Promise<boolean> {
  if (await findProfessionalByUser(vet._id)) return false;

  const filed = await insertProfessional({ user: vet._id, ...APPLICATION });
  const verified = await updateProfessional(filed._id, {
    status: 'verified',
    reviewedBy: reviewer?._id ?? null,
  });

  if (!verified) throw new Error('The seeded application vanished before it could be approved');

  await recordAudit({
    action: 'professional.verified',
    targetType: 'professional',
    targetId: verified._id,
    actor: reviewer?._id ?? null,
    actorEmail: reviewer?.email ?? null,
    reason: 'seeded by seed:accounts',
    metadata: { statusFrom: 'pending', statusTo: 'verified', source: 'cli' },
  });

  return true;
}

async function main(): Promise<void> {
  if (isProduction) {
    throw new Error('Refusing to run in production: these accounts share one documented password.');
  }

  applyDnsServers(env.DNS_SERVERS);

  // connectDb only warns outside production, so without this the script would
  // report success against no database at all.
  const connected = await connectDb();
  if (!connected) throw new Error(`Could not reach Mongo at ${env.MONGODB_URI}`);

  // The unique email index has to exist before the first insert, or two runs
  // racing each other would leave duplicates rather than one refusal.
  await ensureIndexes();

  const seeded = new Map<UserRole, User>();

  for (const spec of ACCOUNTS) {
    const { user, created } = await upsertAccount(spec);
    seeded.set(spec.role, user);
    console.log(
      `[seed:accounts] ${created ? 'created' : 'reset '} ${user.email} as '${user.role}'`
    );
  }

  const vet = seeded.get('professional');
  if (vet) {
    const filed = await ensureApplication(vet, seeded.get('admin') ?? null);
    console.log(
      filed
        ? `[seed:accounts] filed and verified an application for ${vet.email}`
        : `[seed:accounts] ${vet.email} already has an application, left as it is`
    );
  }

  // Echoed only when it is the documented one. A password somebody chose through
  // the environment is theirs, and shell history is not the place for it.
  console.log(
    PASSWORD === DEFAULT_PASSWORD
      ? `[seed:accounts] all three sign in with '${DEFAULT_PASSWORD}'`
      : '[seed:accounts] all three sign in with SEED_ACCOUNTS_PASSWORD'
  );
}

main()
  .catch((err) => {
    console.error(`[seed:accounts] ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
