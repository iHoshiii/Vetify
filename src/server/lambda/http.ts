import serverlessExpress from '@codegenie/serverless-express';
import { createApp } from '../app';
import { initializeLambda } from './runtime';
import { withRealtimeWork } from '../realtime/gateway/work';

const serve = serverlessExpress({ app: createApp() });
export async function handler(...args: Parameters<typeof serve>) {
  args[1].callbackWaitsForEmptyEventLoop = false;
  await initializeLambda();
  return withRealtimeWork(async () => await serve(...args));
}
