import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  countUnreadThreads,
  findMessages,
  findThreadById,
  findThreads,
  insertProfessional,
  type ProfessionalAttrs,
} from '../../models';
import { insertUser, type User } from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import {
  ensureParty,
  openThread,
  readThread,
  sendMessage,
  setThreadShelf,
} from '../messages.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let seq = 0;

async function account(): Promise<User> {
  seq += 1;
  return await insertUser({
    email: `msg${seq}@example.com`,
    password: 'pw12345678',
    name: `Person ${seq}`,
    avatarUrl: null,
    status: 'active',
  });
}

function attrs(user: User, status: ProfessionalAttrs['status'] = 'verified'): ProfessionalAttrs {
  seq += 1;
  return {
    user: user._id,
    fullName: `Vet ${seq}`,
    licenseNumber: `VET-${seq}`,
    licenseAuthority: 'Professional Regulation Commission',
    credentialUrls: ['https://example.com/licence.pdf'],
    clinicName: 'Bayside Animal Clinic',
    addresses: [
      {
        kind: 'clinic',
        line1: '12 Mabini',
        city: 'Cebu',
        province: 'Cebu',
        postalCode: '6000',
        fix: null,
      },
    ],
    businessPhone: '+63 32 555 0101',
    bio: 'Small animal practice.',
    yearsExperience: 10,
    backgroundCheckConsent: true,
    status,
  };
}

// A verified vet plus the account behind it, ready to be messaged.
async function vet(status: ProfessionalAttrs['status'] = 'verified') {
  const owner = await account();
  const application = await insertProfessional(attrs(owner, status));
  return { user: owner, application };
}

describe('openThread', () => {
  it('reuses the one thread for a pair rather than opening a second', async () => {
    const client = await account();
    const { application } = await vet();

    const first = await openThread({ user: client, professionalId: application._id.toString() });
    const second = await openThread({ user: client, professionalId: application._id.toString() });

    expect(first).not.toBeNull();
    expect(second?._id.toString()).toBe(first?._id.toString());
  });

  it('returns null for a vet that is not verified', async () => {
    const client = await account();
    const { application } = await vet('pending');

    expect(
      await openThread({ user: client, professionalId: application._id.toString() })
    ).toBeNull();
  });

  it('refuses a vet opening a thread with themselves', async () => {
    const { user, application } = await vet();

    await expect(
      openThread({ user, professionalId: application._id.toString() })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('ensureParty', () => {
  it('404s an account that is neither side of the thread', async () => {
    const client = await account();
    const { application } = await vet();
    const outsider = await account();

    const thread = await openThread({ user: client, professionalId: application._id.toString() });

    expect(() => ensureParty(thread, outsider)).toThrow();
    expect(() => ensureParty(thread, client)).not.toThrow();
  });
});

describe('sendMessage and readThread', () => {
  it('bumps only the recipient unread, then clears it when they read', async () => {
    const client = await account();
    const { user: vetUser, application } = await vet();
    const thread = await openThread({ user: client, professionalId: application._id.toString() });
    if (!thread) throw new Error('thread not opened');

    await sendMessage({ thread, sender: client, body: 'Is Monday free?' });

    // The vet has one unread; the client who sent it has none.
    expect(await countUnreadThreads(vetUser._id)).toBe(1);
    expect(await countUnreadThreads(client._id)).toBe(0);

    const stamped = await findThreadById(thread._id);
    expect(stamped?.lastBody).toBe('Is Monday free?');

    await readThread(thread, vetUser);
    expect(await countUnreadThreads(vetUser._id)).toBe(0);
  });

  it('stamps the reader side so the other can be shown a Seen', async () => {
    const client = await account();
    const { user: vetUser, application } = await vet();
    const thread = await openThread({ user: client, professionalId: application._id.toString() });
    if (!thread) throw new Error('thread not opened');

    await sendMessage({ thread, sender: client, body: 'Hello?' });
    await readThread(thread, vetUser);

    // The vet read, so their read stamp is set for the client to see.
    const stamped = await findThreadById(thread._id);
    expect(stamped?.professionalReadAt).toBeInstanceOf(Date);
    expect(stamped?.clientReadAt).toBeNull();
  });
});

describe('setThreadShelf', () => {
  it('files the caller side without touching the other, and a new message wakes it', async () => {
    const client = await account();
    const { user: vetUser, application } = await vet();
    const thread = await openThread({ user: client, professionalId: application._id.toString() });
    if (!thread) throw new Error('thread not opened');

    await setThreadShelf({ thread, user: client, state: 'archived' });

    // The client filed it: gone from their active list, still on the vet's.
    const clientActive = await findThreads({ client: client._id, state: 'active' });
    expect(clientActive.total).toBe(0);
    const clientArchived = await findThreads({ client: client._id, state: 'archived' });
    expect(clientArchived.total).toBe(1);
    const vetActive = await findThreads({ professionalUser: vetUser._id, state: 'active' });
    expect(vetActive.total).toBe(1);

    // The vet writing in resurfaces the client's copy the way Messenger does.
    await sendMessage({ thread, sender: vetUser, body: 'Still there?' });
    const wokenActive = await findThreads({ client: client._id, state: 'active' });
    expect(wokenActive.total).toBe(1);
  });

  it('clears the deleter history so a fresh start shows only new messages', async () => {
    const client = await account();
    const { application } = await vet();
    const thread = await openThread({ user: client, professionalId: application._id.toString() });
    if (!thread) throw new Error('thread not opened');

    await sendMessage({ thread, sender: client, body: 'old message' });
    await setThreadShelf({ thread, user: client, state: 'deleted' });

    // Deleting stamps the caller's cut-off, so their past talk is hidden from here on.
    const deleted = await findThreadById(thread._id);
    expect(deleted?.clientDeletedAt).toBeInstanceOf(Date);
    const empty = await findMessages({ thread: thread._id, after: deleted?.clientDeletedAt });
    expect(empty.total).toBe(0);

    // Sending again reopens the caller's copy, and only the new message shows.
    const reopened = deleted ?? thread;
    await sendMessage({ thread: reopened, sender: client, body: 'new message' });
    const active = await findThreads({ client: client._id, state: 'active' });
    expect(active.total).toBe(1);
    const fresh = await findMessages({ thread: thread._id, after: deleted?.clientDeletedAt });
    expect(fresh.items.map((m) => m.body)).toEqual(['new message']);
  });
});
