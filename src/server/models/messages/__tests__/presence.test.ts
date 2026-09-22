import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';
import { findConversationPartnerIds, insertThread } from '../repository';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('conversation presence partners', () => {
  it('finds unique partners from both sides of a user threads', async () => {
    const user = new ObjectId();
    const first = new ObjectId();
    const second = new ObjectId();

    await insertThread({ professional: new ObjectId(), professionalUser: first, client: user });
    await insertThread({ professional: new ObjectId(), professionalUser: user, client: second });
    await insertThread({ professional: new ObjectId(), professionalUser: user, client: first });

    expect(new Set(await findConversationPartnerIds(user))).toEqual(
      new Set([first.toString(), second.toString()])
    );
  });
});
