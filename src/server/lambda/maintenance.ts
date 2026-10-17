import { initializeLambda } from './runtime';
import { maintainRealtime } from '../realtime/gateway/maintenance';
import { withRealtimeWork } from '../realtime/gateway/work';
import { scanReminders } from '../services/reminders.service';
import { scanCompletions } from '../services/appointment-completion.service';
import { scanAppointmentDeliveries } from '../services/appointment-deliveries.service';

const jobs = [
  ['realtime', maintainRealtime],
  ['reminders', scanReminders],
  ['completions', scanCompletions],
  ['appointment-deliveries', scanAppointmentDeliveries],
] as const;

export async function handler(
  _event: unknown,
  context: { callbackWaitsForEmptyEventLoop: boolean }
) {
  context.callbackWaitsForEmptyEventLoop = false;
  await initializeLambda();
  await withRealtimeWork(async () => {
    const results = await Promise.allSettled(jobs.map(async ([, run]) => run()));
    const failures: unknown[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') return;
      console.error(`[maintenance] ${jobs[index][0]} failed`, result.reason);
      failures.push(result.reason);
    });
    if (failures.length) throw new AggregateError(failures, 'Scheduled maintenance failed');
  });
}
