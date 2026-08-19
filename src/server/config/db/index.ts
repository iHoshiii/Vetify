import type { Db, MongoClient } from 'mongodb';
import { state, type DbStatus } from './state';

export { connectDb, disconnectDb } from './client';
export type { DbStatus } from './state';

export function getDb(): Db {
  if (!state.database) {
    // if database is not connected
    throw new Error('Database is not connected. Call connectDb() before querying.');
  }
  return state.database;
}

export function getClient(): MongoClient {
  if (!state.client) {
    // if client is not connected
    throw new Error('Database is not connected. Call connectDb() first.');
  }
  return state.client;
}
// execute this if the db is not equal to null and the server is responding
export function isDbConnected(): boolean {
  return state.database !== null && state.serverResponding;
}

export function dbStatus(): DbStatus {
  if (!state.database) return 'uninitialized'; // if database is not connected, return uninitialized
  return state.serverResponding ? 'connected' : 'disconnected'; // if server is responding, return connected, else return disconnected
}
