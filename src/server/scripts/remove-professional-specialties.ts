import { connectDb, disconnectDb, getDb } from '../config/db';
import { applyDnsServers } from '../config/dns';
import { env } from '../config/env';
import { PROFESSIONALS_COLLECTION } from '../models';

async function main(): Promise<void> {
  applyDnsServers(env.DNS_SERVERS);

  const connected = await connectDb();
  if (!connected) throw new Error(`Could not reach Mongo at ${env.MONGODB_URI}`);

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
  .catch((err) => {
    console.error(`[remove-specialties] ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
