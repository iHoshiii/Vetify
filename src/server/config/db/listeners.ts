import type { MongoClient } from 'mongodb';
import { state } from './state';

export function attachHeartbeatListeners(mongoClient: MongoClient): void {
  mongoClient.on('serverHeartbeatSucceeded', () => {
    // a periodic check to see if the server is alive and responsive
    if (!state.serverResponding) {
      // if the server is not responding while heartbeat succeeded
      state.serverResponding = true; // make it true that the server is responding
      console.log('[db] server responding');
    }
  });

  mongoClient.on('serverHeartbeatFailed', (event) => {
    // if the server heartbeat fails, it means the server is not responding
    if (state.serverResponding) {
      // if the server is responding while heartbeat failed
      state.serverResponding = false; // make it false that the server is responding
      console.error(`[db] heartbeat failed: ${event.failure?.message || 'Unknown error'}`);
    }
  });

  mongoClient.on('topologyClosed', () => {
    // when the server is shutdowned/closed
    state.serverResponding = false; //server should be not responding
  });
}
