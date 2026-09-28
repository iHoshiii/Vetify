import { EventEmitter } from 'node:events';
import { TopologyType, type MongoClient } from 'mongodb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { attachHeartbeatListeners } from '../listeners';
import { state } from '../state';

describe('MongoDB availability listeners', () => {
  let events: EventEmitter;

  beforeEach(() => {
    events = new EventEmitter();
    state.serverResponding = true;
    attachHeartbeatListeners(events as MongoClient);
  });

  afterEach(() => {
    state.serverResponding = false;
    vi.restoreAllMocks();
  });

  it('does not call the whole database down for one failed replica heartbeat', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    events.emit('serverHeartbeatFailed', { failure: new Error('TLS alert 80') });

    expect(state.serverResponding).toBe(true);
    expect(error).not.toHaveBeenCalled();
  });

  it('marks an unavailable topology down and includes the heartbeat cause', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    events.emit('serverHeartbeatFailed', { failure: new Error('TLS alert 80') });
    events.emit('topologyDescriptionChanged', {
      newDescription: { type: TopologyType.ReplicaSetNoPrimary },
    });

    expect(state.serverResponding).toBe(false);
    expect(error).toHaveBeenCalledWith('[db] topology unavailable: TLS alert 80');
  });

  it('returns to connected when the topology has a primary again', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    state.serverResponding = false;

    events.emit('topologyDescriptionChanged', {
      newDescription: { type: TopologyType.ReplicaSetWithPrimary },
    });

    expect(state.serverResponding).toBe(true);
    expect(log).toHaveBeenCalledWith('[db] server responding');
  });
});
