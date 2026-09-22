import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { ThreadState } from '@shared/schemas';

import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';
import { insertThread, threadsCollection, touchThreadOnSend } from '../repository';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

const client = new ObjectId();
const professionalUser = new ObjectId();

// A thread whose professional side sits in a given state, optionally muted.
async function seed(state: ThreadState, muted = false) {
  const thread = await insertThread({
    professional: new ObjectId(),
    professionalUser,
    client,
  });
  await threadsCollection().updateOne(
    { _id: thread._id },
    { $set: { professionalState: state, professionalMuted: muted } }
  );
  return thread._id;
}

// The client sends, so the professional is the recipient whose wake we assert.
async function sendFromClient(thread: ObjectId) {
  await touchThreadOnSend({
    thread,
    sender: client,
    message: new ObjectId(),
    body: 'hello again',
    senderIsClient: true,
    at: new Date(),
  });
  return threadsCollection().findOne({ _id: thread });
}

describe('touchThreadOnSend recipient wake', () => {
  it('wakes an archived (unmuted) thread back to active', async () => {
    const doc = await sendFromClient(await seed('archived'));
    expect(doc?.professionalState).toBe('active');
  });

  it('keeps a muted archived thread archived', async () => {
    const doc = await sendFromClient(await seed('archived', true));
    expect(doc?.professionalState).toBe('archived');
  });

  it('keeps a spam thread as spam no matter how many messages arrive', async () => {
    const thread = await seed('spam');
    await sendFromClient(thread);
    const doc = await sendFromClient(thread);
    expect(doc?.professionalState).toBe('spam');
  });

  it('still bumps the recipient unread count while held', async () => {
    const doc = await sendFromClient(await seed('spam'));
    expect(doc?.professionalUnread).toBe(1);
  });
});
