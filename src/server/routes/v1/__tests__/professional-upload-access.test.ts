import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { captureUploadsCollection } from '../../../models/professional-capture-uploads';
import { updateProfessionalInquiry } from '../../../models/professional-inquiries';
import { findProfessionalByUser } from '../../../models/professionals';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';
import { app, fixture, photo, uploadAll } from './professional-upload-fixtures';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

it('requires a signed-in account matching the invited email before storing any photo', async () => {
  const owner = await fixture();
  const other = await fixture();
  const path = `${owner.base}/captures/portrait`;
  await request(app).post(path).send(photo()).expect(401);
  await request(app).post(path).set('Authorization', other.authorization).send(photo()).expect(403);
  expect(await captureUploadsCollection().countDocuments()).toBe(0);
});

it('refuses expired and already-used invitations', async () => {
  const owner = await fixture();
  await updateProfessionalInquiry(owner.inquiry._id, { inviteExpiresAt: new Date(0) });
  await request(app)
    .post(`${owner.base}/captures/portrait`)
    .set('Authorization', owner.authorization)
    .send(photo())
    .expect(410);
  const current = await fixture();
  const refs = await uploadAll(current);
  await request(app)
    .post(`${current.base}/apply`)
    .set('Authorization', current.authorization)
    .send({ ...current.application, ...refs })
    .expect(201);
  await request(app)
    .post(`${current.base}/captures/portrait`)
    .set('Authorization', current.authorization)
    .send(photo())
    .expect(410);
});

it('rejects another account or invitation photo references without creating an application', async () => {
  const owner = await fixture();
  const other = await fixture();
  const refs = await uploadAll(other);
  await request(app)
    .post(`${owner.base}/apply`)
    .set('Authorization', owner.authorization)
    .send({ ...owner.application, ...refs })
    .expect(400);
  expect(await findProfessionalByUser(owner.user._id)).toBeNull();
});

it('rejects swapped photo kinds and expired uploads', async () => {
  const owner = await fixture();
  const refs = await uploadAll(owner);
  await request(app)
    .post(`${owner.base}/apply`)
    .set('Authorization', owner.authorization)
    .send({ ...owner.application, ...refs, portrait: refs.licenseFront })
    .expect(400);
  await captureUploadsCollection().updateOne(
    { _id: new ObjectId(refs.portrait.uploadId) },
    { $set: { expiresAt: new Date(0) } }
  );
  await request(app)
    .post(`${owner.base}/apply`)
    .set('Authorization', owner.authorization)
    .send({ ...owner.application, ...refs })
    .expect(400);
  expect(await findProfessionalByUser(owner.user._id)).toBeNull();
});

it('rechecks camera freshness at final submission and keeps staged images private', async () => {
  const owner = await fixture();
  const refs = await uploadAll(owner);
  await request(app)
    .get(`/api/v1/professionals/captures/${refs.portrait.uploadId}`)
    .set('Authorization', owner.authorization)
    .expect(404);
  await captureUploadsCollection().updateOne(
    { _id: new ObjectId(refs.portrait.uploadId) },
    { $set: { capturedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString() } }
  );
  await request(app)
    .post(`${owner.base}/apply`)
    .set('Authorization', owner.authorization)
    .send({ ...owner.application, ...refs })
    .expect(400);
});

it('rejects empty decoded photos and unknown photo kinds', async () => {
  const owner = await fixture();
  await request(app)
    .post(`${owner.base}/captures/portrait`)
    .set('Authorization', owner.authorization)
    .send({ ...photo(), data: '!!!!' })
    .expect(400);
  await request(app)
    .post(`${owner.base}/captures/unknown`)
    .set('Authorization', owner.authorization)
    .send(photo())
    .expect(400);
  expect(await captureUploadsCollection().countDocuments()).toBe(0);
});
