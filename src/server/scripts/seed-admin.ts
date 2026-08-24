/**
 * Grants the admin role to one account.
 *
 *   npm run seed:admin -- ada@example.com
 *
 * Somebody has to be the first admin, and no admin route can hand out the role
 * while none exists. This is that bootstrap, deliberately a script rather than an
 * ADMIN_EMAILS variable: an env allowlist re-promotes an account the moment it
 * logs in again, which quietly undoes a demotion, and a typo in it is a
 * privilege grant nobody reviewed.
 *
 * Promotes an existing account by default. To create one that does not exist yet
 * — a fresh database with nobody signed up — set SEED_ADMIN_PASSWORD in the
 * environment rather than passing it as an argument, so it stays out of the
 * shell history.
 */
import type { ObjectId } from 'mongodb';

import { connectDb, disconnectDb } from '../config/db';
import { applyDnsServers } from '../config/dns';
import { env } from '../config/env';
import {
  countActiveAdmins,
  ensureIndexes,
  findUserByEmail,
  insertUser,
  normalizeEmail,
  recordAudit,
  updateUser,
} from '../models';

/**
 * Leaves the grant in the audit log with a null actor.
 *
 * This is the one privileged action nobody can be held to account for — it runs
 * before any admin exists — so the record of *when* an account gained the role,
 * and that it came from the CLI rather than the dashboard, is the only thing
 * distinguishing a deliberate bootstrap from a compromised one later.
 */
async function noteGrant(targetId: ObjectId, from: string | null): Promise<void> {
  await recordAudit({
    action: 'user.role.changed',
    targetType: 'user',
    targetId,
    actor: null,
    reason: 'bootstrap via seed:admin',
    metadata: { from, to: 'admin', source: 'cli' },
  });
}

async function main(): Promise<void> {
  const raw = process.argv[2];
  if (!raw) {
    throw new Error('Usage: npm run seed:admin -- <email>');
  }

  const email = normalizeEmail(raw);
  const password = process.env.SEED_ADMIN_PASSWORD;

  applyDnsServers(env.DNS_SERVERS);

  // connectDb only warns outside production, so a script that ignored this would
  // "succeed" against no database at all.
  const connected = await connectDb();
  if (!connected) throw new Error(`Could not reach Mongo at ${env.MONGODB_URI}`);

  await ensureIndexes();

  const existing = await findUserByEmail(email);

  if (!existing) {
    if (!password) {
      throw new Error(
        `No account for ${email}. Sign up first, then re-run this — or set ` +
          'SEED_ADMIN_PASSWORD to create the account here.'
      );
    }

    const created = await insertUser({
      email,
      password,
      provider: 'local',
      role: 'admin',
      status: 'active',
      // Nobody is going to click a link in an inbox to unlock the account that
      // owns the dashboard.
      emailVerified: true,
    });
    await noteGrant(created._id, null);
    console.log(`[seed:admin] created ${created.email} as an admin`);
  } else if (existing.role === 'admin' && existing.status === 'active') {
    console.log(`[seed:admin] ${email} is already an active admin, nothing to do`);
  } else {
    // Lifts a suspension in the same write: an admin who cannot sign in is not
    // an admin, and this script is the recovery path.
    await updateUser(existing._id, {
      role: 'admin',
      status: 'active',
      statusReason: null,
      statusChangedBy: null,
      statusChangedAt: null,
    });
    await noteGrant(existing._id, existing.role ?? null);
    console.log(`[seed:admin] promoted ${email} from '${existing.role ?? 'user'}' to 'admin'`);
  }

  console.log(`[seed:admin] active admins: ${await countActiveAdmins()}`);
}

main()
  .catch((err) => {
    console.error(`[seed:admin] ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
