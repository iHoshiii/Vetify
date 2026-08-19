import type { Db, MongoClient } from 'mongodb';

export type DbStatus = 'connected' | 'disconnected' | 'uninitialized';

export type DbState = {
  client: MongoClient | null; // let client be MongoClient or null equal to null, so that we can check if the client is connected or not
  database: Db | null; // let database be Db or null equal to null, so that we can check if the database is connected or not
  serverResponding: boolean;
};

export const state: DbState = {
  client: null,
  database: null,
  serverResponding: false,
};
