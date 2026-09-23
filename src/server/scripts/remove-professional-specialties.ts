import { connectDb, disconnectDb, getDb } from '../config/db';
import { applyDnsServers } from '../config/dns';
import { env } from '../config/env';
import { PROFESSIONALS_COLLECTION } from '../models';

async function main(): Promise<void> {
  applyDnsServers(env.DNS_SERVERS);

  const connected = await connectDb();
  if (!connected) throw new Error('Could not reach MongoDB.');

  const professionals = getDb().collection(PROFESSIONALS_COLLECTION);
  const result = await professionals.updateMany(
    { specialties: { $exists: true } },
    { $unset: { specialties: '' } }
  );

  const specialtyIndex = (await professionals.listIndexes().toArray()).find(
    (index) => index.key.specialties === 1
  );
  if (specialtyIndex?.name) await professionals.dropIndex(specialtyIndex.name);

  console.log(`[remove-specialties] cleaned ${result.modifiedCount} professional record(s)`);
  console.log(
    specialtyIndex?.name
      ? `[remove-specialties] dropped ${specialtyIndex.name}`
      : '[remove-specialties] no specialty index found'
  );
}

main()
  .catch(() => {
    // Driver errors can contain the full connection URI, including credentials.
    console.error('[remove-specialties] migration failed. Check database connectivity and retry.');
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
