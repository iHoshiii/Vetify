import request from 'supertest';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { PROFESSIONAL_PHOTO_MAX_BYTES } from '@shared/limits';
import { professionalCapturesCollection } from '../../../models/professional-captures';
import { captureUploadsCollection } from '../../../models/professional-capture-uploads';
import { findProfessionalByUser } from '../../../models/professionals';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';
import { app, fixture, photo, uploadAll } from './professional-upload-fixtures';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

it('files all three maximum-size photos using requests below Lambda payload limits', async () => {
  const owner = await fixture();
  const maximum = photo(PROFESSIONAL_PHOTO_MAX_BYTES);
  expect(Buffer.byteLength(JSON.stringify({ body: JSON.stringify(maximum) }))).toBeLessThan(
    6 * 1024 * 1024
  );
  const refs = await uploadAll(owner, PROFESSIONAL_PHOTO_MAX_BYTES);
  const body = { ...owner.application, ...refs };
  expect(Buffer.byteLength(JSON.stringify(body))).toBeLessThan(64 * 1024);
  const response = await request(app)
    .post(`${owner.base}/apply`)
    .set('Authorization', owner.authorization)
    .send(body)
    .expect(201);
  expect(response.body.status).toBe('pending');
  const stored = await professionalCapturesCollection().find({ user: owner.user._id }).toArray();
  expect(stored).toHaveLength(3);
  expect(stored.every((capture) => capture.byteLength === PROFESSIONAL_PHOTO_MAX_BYTES)).toBe(true);
  await request(app)
    .get(`/api/v1/professionals/captures/${stored[0]._id}`)
    .set('Authorization', owner.authorization)
    .expect(200);
  expect(await captureUploadsCollection().countDocuments({ user: owner.user._id })).toBe(0);
});

it('keeps staged photographs available when the application needs correction', async () => {
  const owner = await fixture();
  const refs = await uploadAll(owner);
  await request(app)
    .post(`${owner.base}/apply`)
    .set('Authorization', owner.authorization)
    .send({ ...owner.application, ...refs, backgroundCheckConsent: false })
    .expect(400);
  expect(await findProfessionalByUser(owner.user._id)).toBeNull();
  expect(await captureUploadsCollection().countDocuments()).toBe(3);
  await request(app)
    .post(`${owner.base}/apply`)
    .set('Authorization', owner.authorization)
    .send({ ...owner.application, ...refs })
    .expect(201);
});

it('invalidates the old reference when a photograph is replaced', async () => {
  const owner = await fixture();
  const refs = await uploadAll(owner);
  const replacement = await request(app)
    .post(`${owner.base}/captures/portrait`)
    .set('Authorization', owner.authorization)
    .send(photo(80))
    .expect(201);
  expect(replacement.body.uploadId).toBe(refs.portrait.uploadId);
  expect(replacement.body.revision).not.toBe(refs.portrait.revision);
  expect(await captureUploadsCollection().countDocuments()).toBe(3);
  await request(app)
    .post(`${owner.base}/apply`)
    .set('Authorization', owner.authorization)
    .send({ ...owner.application, ...refs })
    .expect(400);
  refs.portrait = replacement.body;
  await request(app)
    .post(`${owner.base}/apply`)
    .set('Authorization', owner.authorization)
    .send({ ...owner.application, ...refs })
    .expect(201);
});

it('serializes simultaneous uploads through the unique owner/invitation/kind index', async () => {
  const owner = await fixture();
  const responses = await Promise.all(
    [32, 64].map((size) =>
      request(app)
        .post(`${owner.base}/captures/portrait`)
        .set('Authorization', owner.authorization)
        .send(photo(size))
    )
  );
  expect(responses.map((response) => response.status)).toEqual([201, 201]);
  expect(responses[0].body.uploadId).toBe(responses[1].body.uploadId);
  expect(await captureUploadsCollection().countDocuments()).toBe(1);
  const indexes = await captureUploadsCollection().indexes();
  expect(indexes.some((index) => index.key.expiresAt === 1 && index.expireAfterSeconds === 0)).toBe(
    true
  );
});
