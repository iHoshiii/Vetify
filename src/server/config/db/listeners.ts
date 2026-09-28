import { TopologyType, type MongoClient } from 'mongodb';
import { state } from './state';

export function attachHeartbeatListeners(mongoClient: MongoClient): void {
  let lastHeartbeatFailure: string | null = null;

  // A heartbeat belongs to one replica, not the deployment as a whole. Keep its
  // failure for diagnostics, but let the driver's topology decide availability.
  mongoClient.on('serverHeartbeatFailed', (event) => {
    lastHeartbeatFailure = event.failure?.message || 'Unknown heartbeat error';
  });

  mongoClient.on('topologyDescriptionChanged', (event) => {
    const type = event.newDescription.type;
    const responding = type !== TopologyType.Unknown && type !== TopologyType.ReplicaSetNoPrimary;

    if (responding && !state.serverResponding) {
      state.serverResponding = true;
      lastHeartbeatFailure = null;
      console.log('[db] server responding');
    } else if (!responding && state.serverResponding) {
      state.serverResponding = false;
      const detail = lastHeartbeatFailure ? `: ${lastHeartbeatFailure}` : '';
      console.error(`[db] topology unavailable${detail}`);
    }
  });

  mongoClient.on('topologyClosed', () => {
    state.serverResponding = false;
  });
}
