/**
 * One-time migration for accounts created before roles existed.
 *
 *   npm run backfill:roles
 *
 * `toPublicUser` and `requireRole` both default a missing field to the safe
 * value, so the application works without this. The backfill still matters for
 * the admin list: a query filtering on `role` or `status` skips documents where
 * the field is absent, so unmigrated users would silently vanish from the very
 * screens meant to show every account.
 *
 * Idempotent — each pass only touches documents still missing the field.
 */
import { connectDb, disconnectDb } from '../config/db';
import { applyDnsServers } from '../config/dns';
import { env } from '../config/env';
import { usersCollection } from '../models';

async function main(): Promise<void> {
  applyDnsServers(env.DNS_SERVERS);

  const connected = await connectDb();
  if (!connected) throw new Error(`Could not reach Mongo at ${env.MONGODB_URI}`);

  const users = usersCollection();

  const roles = await users.updateMany({ role: { $exists: false } }, { $set: { role: 'user' } });

  // Separate filter rather than one $or: an account can predate the status field
  // while already having a role, if it was promoted between the two migrations.
  const statuses = await users.updateMany(
    { status: { $exists: false } },
    {
      $set: {
        status: 'active',
        statusReason: null,
        statusChangedBy: null,
        statusChangedAt: null,
      },
    }
  );

  console.log(`[backfill:roles] role set on ${roles.modifiedCount} user(s)`);
  console.log(`[backfill:roles] status set on ${statuses.modifiedCount} user(s)`);
  console.log(`[backfill:roles] total users: ${await users.countDocuments()}`);
}

main()
  .catch((err) => {
    console.error(`[backfill:roles] ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
