import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from '../maintenance';
import { initializeLambda } from '../runtime';
import { maintainRealtime } from '../../realtime/gateway/maintenance';
import { queueDelivery } from '../../realtime/gateway/work';
import { scanReminders } from '../../services/reminders.service';
import { scanCompletions } from '../../services/appointment-completion.service';
import { scanAppointmentDeliveries } from '../../services/appointment-deliveries.service';

vi.mock('../runtime', () => ({ initializeLambda: vi.fn() }));
vi.mock('../../realtime/gateway/maintenance', () => ({ maintainRealtime: vi.fn() }));
vi.mock('../../services/reminders.service', () => ({ scanReminders: vi.fn() }));
vi.mock('../../services/appointment-completion.service', () => ({ scanCompletions: vi.fn() }));
vi.mock('../../services/appointment-deliveries.service', () => ({
  scanAppointmentDeliveries: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('scheduled Lambda maintenance', () => {
  it('runs appointment jobs and realtime cleanup without starting interval timers', async () => {
    const interval = vi.spyOn(globalThis, 'setInterval');
    const context = { callbackWaitsForEmptyEventLoop: true };
    await handler({}, context);
    expect(initializeLambda).toHaveBeenCalledOnce();
    for (const job of [maintainRealtime, scanReminders, scanCompletions, scanAppointmentDeliveries])
      expect(job).toHaveBeenCalledOnce();
    expect(interval).not.toHaveBeenCalled();
    expect(context.callbackWaitsForEmptyEventLoop).toBe(false);
  });

  it('runs every job and propagates failures so the scheduled invocation can retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(scanReminders).mockRejectedValueOnce(new Error('Transient delivery failure'));
    await expect(handler({}, { callbackWaitsForEmptyEventLoop: true })).rejects.toThrow(
      'Scheduled maintenance failed'
    );
    expect(scanCompletions).toHaveBeenCalledOnce();
    expect(scanAppointmentDeliveries).toHaveBeenCalledOnce();
    expect(maintainRealtime).toHaveBeenCalledOnce();
  });

  it('waits for realtime notifications produced by appointment jobs', async () => {
    let finish!: () => void;
    let delivered = false;
    let finished = false;
    vi.mocked(scanCompletions).mockImplementationOnce(async () => {
      queueDelivery(
        new Promise<void>((resolve) => {
          finish = resolve;
        }).then(() => {
          delivered = true;
        })
      );
    });
    const invocation = handler({}, { callbackWaitsForEmptyEventLoop: true }).then(() => {
      finished = true;
    });
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    expect(finished).toBe(false);
    finish();
    await invocation;
    expect(delivered).toBe(true);
  });
});
