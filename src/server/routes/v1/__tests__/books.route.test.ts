import { Binary, ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOOK_MAX_BYTES } from '@shared/books';
import { createApp } from '../../../app';
import {
  bookAllowance,
  bookAffiliatePage,
  bookMonth,
  booksCollection,
  quotasCollection,
  recordBookCommission,
} from '../../../models/books';
import { insertUser, updateUser, type UserRole } from '../../../models/users';
import { signAccessToken } from '../../../services/auth.service';
import {
  findProfessionalByUser,
  insertProfessional,
  updateProfessional,
} from '../../../models/professionals';
import { screenBook } from '../../../services/book-screening.service';
import { checkNextBook } from '../../../services/book-review.service';
import { makeBookPdf } from '../../../test-utils/book-pdf';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();
beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);
vi.mock('../../../services/book-screening.service', () => ({
  BOOK_SCREENING_RULES_VERSION: 'vet-relevance-v1',
  screenBook: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(screenBook).mockReset();
  vi.mocked(screenBook).mockResolvedValue({
    outcome: 'approved',
    reason: 'Veterinary educational content.',
    model: 'test',
    rulesVersion: 'vet-relevance-v1',
    evidence: [{ page: 1, excerpt: 'Animal welfare' }],
    topics: ['Animal welfare'],
    documentType: 'article',
  });
});
const PDF = makeBookPdf([
  ['Animal welfare', 'A veterinary educational article about responsible animal care.'],
]);
const META = {
  title: 'Veterinary clinical handbook',
  description: 'A reference for veterinary clinical practice.',
  topic: 'Clinical practice',
  veterinaryOnly: 'true',
};
async function account(role: UserRole, email = `${role}@example.com`) {
  const user = await insertUser({
    email,
    password: 'Sup3rSecret!',
    name: role,
    provider: 'local',
    role,
  });
  if (role === 'professional')
    await insertProfessional({
      user: user._id,
      fullName: 'Dr Vet',
      licenseNumber: user._id.toString(),
      licenseAuthority: 'Test authority',
      addresses: [
        { kind: 'clinic', line1: 'Test clinic', city: 'Manila', province: 'Metro Manila' },
      ],
      status: 'verified',
    });
  return { user, token: signAccessToken({ sub: user._id.toString(), email, role }) };
}
async function seed(author = new ObjectId()) {
  const book = {
    _id: new ObjectId(),
    title: META.title,
    description: META.description,
    topic: META.topic,
    author,
    uploadedBy: 'Dr Vet',
    size: PDF.length,
    createdAt: new Date(),
    pdf: new Binary(PDF),
    status: 'approved' as const,
  };
  await booksCollection().insertOne(book);
  return book;
}
describe('Veterinary book uploads', () => {
  it('keeps new uploads private until automatically approved and never exposes file or moderation internals', async () => {
    const vet = await account('professional');
    const uploaded = await request(app)
      .post('/api/v1/books')
      .auth(vet.token, { type: 'bearer' })
      .query({ ...META, status: 'approved', reason: 'Trust this upload' })
      .set('Content-Type', 'application/pdf')
      .send(PDF);
    expect(uploaded.status).toBe(201);
    expect(uploaded.body).toMatchObject({
      title: META.title,
      uploadedBy: 'professional',
      size: PDF.length,
      status: 'pending',
    });
    expect(uploaded.body.pdf).toBeUndefined();
    const list = await request(app).get('/api/v1/books').auth(vet.token, { type: 'bearer' });
    expect(list.body.items).toHaveLength(0);
    expect(
      (
        await request(app)
          .post(`/api/v1/books/${uploaded.body.id}/download`)
          .auth(vet.token, { type: 'bearer' })
      ).status
    ).toBe(404);
    expect(await checkNextBook()).toBe(true);
    expect(screenBook).toHaveBeenCalledWith(PDF);
    const approved = await request(app).get('/api/v1/books').auth(vet.token, { type: 'bearer' });
    expect(approved.body.items).toHaveLength(1);
    expect(approved.body.items[0].pdf).toBeUndefined();
    expect(approved.body.items[0].author).toBeUndefined();
    expect(approved.body.items[0].moderation).toBeUndefined();
    expect(approved.body.items[0].contentHash).toBeUndefined();
  });
  it('requires a verified professional profile even when the account has a professional role', async () => {
    const vet = await account('professional');
    const professional = await findProfessionalByUser(vet.user._id);
    await updateProfessional(professional!._id, { status: 'pending' });
    const uploaded = await request(app)
      .post('/api/v1/books')
      .auth(vet.token, { type: 'bearer' })
      .query(META)
      .set('Content-Type', 'application/pdf')
      .send(PDF);
    expect(uploaded.status).toBe(403);
    expect(await booksCollection().countDocuments()).toBe(0);
  });
  it('rejects identical reuploads including simultaneous submissions without creating new commission identities', async () => {
    const vet = await account('professional');
    const upload = () =>
      request(app)
        .post('/api/v1/books')
        .auth(vet.token, { type: 'bearer' })
        .query(META)
        .set('Content-Type', 'application/pdf')
        .send(PDF);
    const results = await Promise.all([upload(), upload(), upload()]);
    expect(results.map((response) => response.status).sort()).toEqual([201, 409, 409]);
    expect(await booksCollection().countDocuments()).toBe(1);
  });
  it('hides every non-approved state and legacy uploads from readers and earns nothing', async () => {
    const vet = await account('professional');
    const reader = await account('user');
    for (const status of ['pending', 'checking', 'rejected', 'unverified', undefined] as const) {
      const book = await seed(vet.user._id);
      await booksCollection().updateOne(
        { _id: book._id },
        status ? { $set: { status } } : { $unset: { status: '' } }
      );
      expect(
        (
          await request(app)
            .post(`/api/v1/books/${book._id}/download`)
            .auth(reader.token, { type: 'bearer' })
        ).status
      ).toBe(404);
      expect(
        (
          await request(app)
            .get(`/api/v1/books/${book._id}/allowance`)
            .auth(reader.token, { type: 'bearer' })
        ).status
      ).toBe(404);
    }
    const list = await request(app).get('/api/v1/books').auth(reader.token, { type: 'bearer' });
    expect(list.body.items).toHaveLength(0);
    expect(list.body.total).toBe(0);
    expect(await quotasCollection().countDocuments()).toBe(0);
  });
  it('keeps unrelated uploads private and shows reasons only to the uploader', async () => {
    const vet = await account('professional');
    const otherVet = await account('professional', 'another-vet@example.com');
    const book = await seed(vet.user._id);
    await booksCollection().updateOne({ _id: book._id }, { $set: { status: 'pending' } });
    vi.mocked(screenBook).mockResolvedValue({
      outcome: 'rejected',
      reason: 'This document is a resume.',
      model: 'test',
      rulesVersion: 'vet-relevance-v1',
      evidence: [],
      topics: [],
      documentType: 'other',
    });
    await checkNextBook();
    const own = await request(app).get('/api/v1/books/mine').auth(vet.token, { type: 'bearer' });
    expect(own.body.items[0]).toMatchObject({
      status: 'rejected',
      reason: 'This document is a resume.',
    });
    expect(own.body.items[0].pdf).toBeUndefined();
    expect(own.body.items[0].moderation).toBeUndefined();
    expect(
      (await request(app).get('/api/v1/books/mine').auth(otherVet.token, { type: 'bearer' })).body
        .items
    ).toHaveLength(0);
    const reader = await account('user');
    expect(
      (await request(app).get('/api/v1/books/mine').auth(reader.token, { type: 'bearer' })).status
    ).toBe(403);
  });
  it('retries uncertainty once, then allows only the owner to request another check after cooldown', async () => {
    const vet = await account('professional');
    const otherVet = await account('professional', 'another-vet@example.com');
    const book = await seed(vet.user._id);
    await booksCollection().updateOne({ _id: book._id }, { $set: { status: 'pending' } });
    vi.mocked(screenBook).mockResolvedValue({
      outcome: 'uncertain',
      reason: 'Content could not be verified.',
      model: 'test',
      rulesVersion: 'vet-relevance-v1',
      evidence: [],
      topics: [],
      documentType: 'other',
    });
    await checkNextBook();
    expect((await booksCollection().findOne({ _id: book._id }))?.status).toBe('pending');
    expect(await checkNextBook()).toBe(false);
    await checkNextBook(new Date(Date.now() + 60_000));
    expect((await booksCollection().findOne({ _id: book._id }))?.status).toBe('unverified');
    const retry = (token: string) =>
      request(app).post(`/api/v1/books/${book._id}/recheck`).auth(token, { type: 'bearer' });
    expect((await retry(otherVet.token)).status).toBe(404);
    expect((await retry(vet.token)).status).toBe(429);
    await booksCollection().updateOne(
      { _id: book._id },
      { $set: { 'moderation.checkedAt': new Date(Date.now() - 61_000) } }
    );
    expect((await retry(vet.token)).body.status).toBe('pending');
    expect((await retry(vet.token)).status).toBe(409);
  });
  it('retries service outages without approval and recovers expired leases after a restart', async () => {
    const vet = await account('professional');
    const book = await seed(vet.user._id);
    await booksCollection().updateOne(
      { _id: book._id },
      {
        $set: {
          status: 'checking',
          'moderation.token': 'old-worker',
          'moderation.lockUntil': new Date(Date.now() - 1),
        },
      }
    );
    vi.mocked(screenBook).mockResolvedValue({
      outcome: 'unavailable',
      reason: 'Checking is temporarily unavailable.',
      model: 'test',
      rulesVersion: 'vet-relevance-v1',
      evidence: [],
      topics: [],
      documentType: 'other',
    });
    await checkNextBook();
    const waiting = await booksCollection().findOne({ _id: book._id });
    expect(waiting?.status).toBe('pending');
    expect(waiting?.moderation?.nextCheckAt!.getTime()).toBeGreaterThan(Date.now());
    expect(waiting?.moderation?.token).toBeUndefined();
    expect(await checkNextBook()).toBe(false);
    vi.mocked(screenBook).mockResolvedValue({
      outcome: 'approved',
      reason: 'Veterinary content.',
      model: 'test',
      rulesVersion: 'vet-relevance-v1',
      evidence: [{ page: 1, excerpt: 'Animal welfare' }],
      topics: ['Animal welfare'],
      documentType: 'article',
    });
    await checkNextBook(new Date(Date.now() + 120_000));
    expect((await booksCollection().findOne({ _id: book._id }))?.status).toBe('approved');
  });
  it('claims each pending document once across simultaneous workers', async () => {
    const vet = await account('professional');
    const book = await seed(vet.user._id);
    await booksCollection().updateOne({ _id: book._id }, { $set: { status: 'pending' } });
    const results = await Promise.all([checkNextBook(), checkNextBook(), checkNextBook()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(screenBook).toHaveBeenCalledOnce();
    expect((await booksCollection().findOne({ _id: book._id }))?.moderation?.attempts).toBe(1);
  });
  it('holds a queued upload if the uploader loses verification before screening', async () => {
    const vet = await account('professional');
    const book = await seed(vet.user._id);
    await booksCollection().updateOne({ _id: book._id }, { $set: { status: 'pending' } });
    const professional = await findProfessionalByUser(vet.user._id);
    await updateProfessional(professional!._id, { status: 'suspended' });
    await checkNextBook();
    expect(screenBook).not.toHaveBeenCalled();
    expect((await booksCollection().findOne({ _id: book._id }))?.status).toBe('unverified');
  });
  it('rechecks legacy uploads without changing their identity or existing commission history', async () => {
    const vet = await account('professional');
    const reader = await account('user');
    const book = await seed(vet.user._id);
    for (let index = 0; index < 3; index++)
      await recordBookCommission(
        reader.user._id.toString(),
        book._id.toString(),
        new Date(),
        vet.user._id
      );
    await booksCollection().updateOne({ _id: book._id }, { $unset: { status: '' } });
    expect(
      (await request(app).get('/api/v1/books').auth(reader.token, { type: 'bearer' })).body.items
    ).toHaveLength(0);
    await checkNextBook();
    expect(
      (
        await request(app)
          .post(`/api/v1/books/${book._id}/download`)
          .auth(reader.token, { type: 'bearer' })
      ).status
    ).toBe(200);
    expect(await bookAffiliatePage(vet.user._id, 1)).toMatchObject({
      earningsCentavos: 600,
      downloads: 3,
    });
    expect(await booksCollection().countDocuments()).toBe(1);
  });
  it('refuses anonymous callers, ordinary users, admins and stale professional tokens', async () => {
    expect(
      (
        await request(app)
          .post('/api/v1/books')
          .query(META)
          .set('Content-Type', 'application/pdf')
          .send(PDF)
      ).status
    ).toBe(401);
    for (const role of ['user', 'admin'] as const) {
      const actor = await account(role);
      expect(
        (
          await request(app)
            .post('/api/v1/books')
            .auth(actor.token, { type: 'bearer' })
            .query(META)
            .set('Content-Type', 'application/pdf')
            .send(PDF)
        ).status
      ).toBe(403);
    }
    const vet = await account('professional');
    await updateUser(vet.user._id, { role: 'user' });
    expect(
      (
        await request(app)
          .post('/api/v1/books')
          .auth(vet.token, { type: 'bearer' })
          .query(META)
          .set('Content-Type', 'application/pdf')
          .send(PDF)
      ).status
    ).toBe(403);
    expect(await booksCollection().countDocuments()).toBe(0);
  });
  it('requires a veterinary topic and confirmation, rejects invalid and oversized files', async () => {
    const vet = await account('professional');
    const upload = (meta = META, pdf = PDF) =>
      request(app)
        .post('/api/v1/books')
        .auth(vet.token, { type: 'bearer' })
        .query(meta)
        .set('Content-Type', 'application/pdf')
        .send(pdf);
    expect((await upload({ ...META, topic: 'Cooking' })).status).toBe(400);
    expect((await upload({ ...META, veterinaryOnly: 'false' })).status).toBe(400);
    expect((await upload(META, Buffer.from('this is not a PDF'))).status).toBe(400);
    expect((await upload(META, Buffer.alloc(BOOK_MAX_BYTES + 1))).status).toBe(413);
    expect(await booksCollection().countDocuments()).toBe(0);
  });
});
describe('Monthly book downloads', () => {
  it('permits unlimited books and repeat downloads with separate commission slots for each book', async () => {
    const reader = await account('user');
    const books = await Promise.all(Array.from({ length: 5 }, () => seed()));
    // Old account-wide counters must not carry over to the corrected per-book policy.
    await quotasCollection().insertOne({ _id: `${reader.user._id}:${bookMonth().key}`, used: 3 });
    for (const book of books.slice(0, 4)) {
      for (let i = 0; i < 3; i++) {
        expect(
          (
            await request(app)
              .post(`/api/v1/books/${book._id}/download`)
              .auth(reader.token, { type: 'bearer' })
          ).status
        ).toBe(200);
      }
      expect(
        (
          await request(app)
            .post(`/api/v1/books/${book._id}/download`)
            .auth(reader.token, { type: 'bearer' })
        ).status
      ).toBe(200);
    }
    const list = await request(app).get('/api/v1/books').auth(reader.token, { type: 'bearer' });
    expect(list.status).toBe(200);
    for (const book of books.slice(0, 4)) {
      expect(await bookAllowance(reader.user._id.toString(), book._id.toString())).toMatchObject({
        used: 3,
        remaining: 0,
      });
    }
    expect(await bookAllowance(reader.user._id.toString(), books[4]._id.toString())).toMatchObject({
      used: 0,
      remaining: 3,
    });
  });
  it('serves fourth downloads and keeps commission slots separate for each account', async () => {
    const book = await seed();
    const first = await account('user');
    const second = await account('user', 'second@example.com');
    const download = (token: string) =>
      request(app).post(`/api/v1/books/${book._id}/download`).auth(token, { type: 'bearer' });
    for (let i = 0; i < 3; i++) {
      const res = await download(first.token);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(PDF);
      expect(res.headers['cache-control']).toBe('no-store');
    }
    const fourth = await download(first.token);
    expect(fourth.status).toBe(200);
    expect(fourth.body).toEqual(PDF);
    expect((await download(second.token)).status).toBe(200);
    const allowance = await request(app)
      .get(`/api/v1/books/${book._id}/allowance`)
      .auth(first.token, { type: 'bearer' });
    expect(allowance.body).toMatchObject({ used: 3, remaining: 0 });
  });
  it('serves every simultaneous download while consuming only three commission slots', async () => {
    const book = await seed();
    const reader = await account('user');
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app)
          .post(`/api/v1/books/${book._id}/download`)
          .auth(reader.token, { type: 'bearer' })
      )
    );
    expect(results.every((res) => res.status === 200)).toBe(true);
    expect(results.every((res) => res.body.equals(PDF))).toBe(true);
    expect(await bookAllowance(reader.user._id.toString(), book._id.toString())).toMatchObject({
      used: 3,
      remaining: 0,
    });
  });
  it('resets at Singapore midnight in the next month, including the year boundary', async () => {
    const reader = await account('user');
    const id = reader.user._id.toString();
    const bookId = new ObjectId().toString();
    const december = new Date('2026-12-31T15:59:59Z');
    const january = new Date('2026-12-31T16:00:00Z');
    for (let i = 0; i < 3; i++) await recordBookCommission(id, bookId, december);
    expect(await recordBookCommission(id, bookId, december)).toBeNull();
    expect(bookMonth(december).resetsAt).toBe(january.toISOString());
    expect(await bookAllowance(id, bookId, january)).toMatchObject({ used: 0, remaining: 3 });
    expect(await recordBookCommission(id, bookId, january)).not.toBeNull();
  });
  it('does not count missing books and refuses anonymous or suspended downloads', async () => {
    const book = await seed();
    const reader = await account('user');
    expect((await request(app).post(`/api/v1/books/${book._id}/download`)).status).toBe(401);
    for (const id of ['invalid', new ObjectId().toString()]) {
      expect(
        (
          await request(app)
            .post(`/api/v1/books/${id}/download`)
            .auth(reader.token, { type: 'bearer' })
        ).status
      ).toBe(404);
    }
    expect(await bookAllowance(reader.user._id.toString(), book._id.toString())).toMatchObject({
      used: 0,
    });
    await updateUser(reader.user._id, {
      status: 'suspended',
      statusUntil: new Date(Date.now() + 86400000),
    });
    expect(
      (
        await request(app)
          .post(`/api/v1/books/${book._id}/download`)
          .auth(reader.token, { type: 'bearer' })
      ).status
    ).toBe(403);
  });
});

describe('Book affiliate earnings', () => {
  it('charts actual credits on Singapore calendar days, fills quiet days and ranks all books independently of pagination', async () => {
    const vet = await account('professional');
    const otherVet = await account('professional', 'other-vet@example.com');
    const first = await seed(vet.user._id);
    const second = await seed(vet.user._id);
    const other = await seed(otherVet.user._id);
    const beforeMidnight = new Date('2026-10-01T15:59:59Z');
    const midnight = new Date('2026-10-01T16:00:00Z');
    const now = new Date('2026-10-02T03:00:00Z');
    const reader = new ObjectId().toString();
    await recordBookCommission(reader, first._id.toString(), beforeMidnight, vet.user._id);
    await recordBookCommission(reader, first._id.toString(), midnight, vet.user._id);
    await recordBookCommission(reader, first._id.toString(), midnight, vet.user._id);
    await recordBookCommission(reader, first._id.toString(), midnight, vet.user._id); // Fourth: no credit.
    await recordBookCommission(reader, second._id.toString(), midnight, vet.user._id);
    await recordBookCommission(
      vet.user._id.toString(),
      first._id.toString(),
      midnight,
      vet.user._id
    ); // Self: no credit.
    await recordBookCommission(reader, other._id.toString(), midnight, otherVet.user._id);
    await recordBookCommission(
      new ObjectId().toString(),
      second._id.toString(),
      new Date('2026-08-01T03:00:00Z'),
      vet.user._id
    );
    const charts = await bookAffiliatePage(vet.user._id, 1, now);
    expect(charts.daily).toHaveLength(30);
    expect(charts.daily[0]).toEqual({ date: '2026-09-03', earningsCentavos: 0, downloads: 0 });
    expect(charts.daily[28]).toEqual({ date: '2026-10-01', earningsCentavos: 200, downloads: 1 });
    expect(charts.daily[29]).toEqual({ date: '2026-10-02', earningsCentavos: 600, downloads: 3 });
    expect(charts.daily.reduce((sum, day) => sum + day.earningsCentavos, 0)).toBe(800);
    expect(charts.topBooks.map((book) => [book.id, book.downloads])).toEqual([
      [first._id.toString(), 3],
      [second._id.toString(), 2],
    ]);
    expect(charts.topBooks.map((book) => book.earningsCentavos)).toEqual([600, 400]);
    const otherPage = await bookAffiliatePage(vet.user._id, 2, now);
    expect(otherPage.items).toHaveLength(0);
    expect(otherPage.daily).toEqual(charts.daily);
    expect(otherPage.topBooks).toEqual(charts.topBooks);
    const empty = await bookAffiliatePage(new ObjectId(), 1, now);
    expect(empty.daily.every((day) => day.downloads === 0 && day.earningsCentavos === 0)).toBe(
      true
    );
    expect(empty.topBooks).toEqual([]);
  });
  it('earns another six pesos from the first three downloads of a different user', async () => {
    const vet = await account('professional');
    const first = await account('user');
    const second = await account('user', 'second-reader@example.com');
    const book = await seed(vet.user._id);
    for (const reader of [first, second]) {
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post(`/api/v1/books/${book._id}/download`)
          .auth(reader.token, { type: 'bearer' });
        expect(response.status).toBe(200);
        expect(response.body).toEqual(PDF);
      }
    }
    expect(await bookAffiliatePage(vet.user._id, 1)).toMatchObject({
      earningsCentavos: 1200,
      downloads: 6,
    });
  });
  it('adds 200 centavos per eligible download to the uploader, never to another professional', async () => {
    const vet = await account('professional');
    const otherVet = await account('professional', 'other-vet@example.com');
    const reader = await account('user');
    const first = await seed(vet.user._id);
    const second = await seed(vet.user._id);
    await seed(otherVet.user._id);
    const download = (id: ObjectId) =>
      request(app)
        .post(`/api/v1/books/${id}/download`)
        .auth(reader.token, { type: 'bearer' })
        .send({ earningsCentavos: 999999, author: otherVet.user._id });
    for (let i = 0; i < 3; i++) expect((await download(first._id)).status).toBe(200);
    for (let i = 0; i < 5; i++) expect((await download(first._id)).status).toBe(200);
    expect((await download(second._id)).status).toBe(200);
    const earned = await request(app)
      .get('/api/v1/books/affiliate')
      .auth(vet.token, { type: 'bearer' });
    expect(earned.status).toBe(200);
    expect(earned.body).toMatchObject({
      earningsCentavos: 800,
      monthEarningsCentavos: 800,
      downloads: 4,
      rateCentavos: 200,
    });
    expect(
      earned.body.items.find((item: { id: string }) => item.id === first._id.toString())
    ).toMatchObject({ downloads: 3, earningsCentavos: 600 });
    expect(
      earned.body.items.find((item: { id: string }) => item.id === second._id.toString())
    ).toMatchObject({ downloads: 1, earningsCentavos: 200 });
    expect(earned.headers['cache-control']).toBe('no-store');
    const other = await request(app)
      .get('/api/v1/books/affiliate')
      .auth(otherVet.token, { type: 'bearer' });
    expect(other.body).toMatchObject({ earningsCentavos: 0, downloads: 0 });
    expect(other.body.items).toHaveLength(1);
    expect(other.body.items[0].id).not.toBe(first._id.toString());
  });
  it('never rewards self-downloads, missing books or rejected requests', async () => {
    const vet = await account('professional');
    const reader = await account('user');
    const book = await seed(vet.user._id);
    for (let i = 0; i < 3; i++)
      expect(
        (
          await request(app)
            .post(`/api/v1/books/${book._id}/download`)
            .auth(vet.token, { type: 'bearer' })
        ).status
      ).toBe(200);
    expect(
      (
        await request(app)
          .post(`/api/v1/books/${book._id}/download`)
          .auth(vet.token, { type: 'bearer' })
      ).status
    ).toBe(200);
    expect((await request(app).post(`/api/v1/books/${book._id}/download`)).status).toBe(401);
    expect(
      (
        await request(app)
          .post(`/api/v1/books/${new ObjectId()}/download`)
          .auth(reader.token, { type: 'bearer' })
      ).status
    ).toBe(404);
    await updateUser(reader.user._id, { status: 'banned' });
    expect(
      (
        await request(app)
          .post(`/api/v1/books/${book._id}/download`)
          .auth(reader.token, { type: 'bearer' })
      ).status
    ).toBe(403);
    expect(await bookAffiliatePage(vet.user._id, 1)).toMatchObject({
      earningsCentavos: 0,
      monthEarningsCentavos: 0,
      downloads: 0,
    });
    expect(await bookAllowance(vet.user._id.toString(), book._id.toString())).toMatchObject({
      used: 3,
    });
  });
  it('credits only three downloads during a concurrent burst and retains each credit record', async () => {
    const vet = await account('professional');
    const reader = await account('user');
    const book = await seed(vet.user._id);
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app)
          .post(`/api/v1/books/${book._id}/download`)
          .auth(reader.token, { type: 'bearer' })
      )
    );
    expect(results.every((result) => result.status === 200)).toBe(true);
    expect(results.every((result) => result.body.equals(PDF))).toBe(true);
    const quota = await quotasCollection().findOne({ author: vet.user._id, bookId: book._id });
    expect(quota).toMatchObject({ used: 3, paidDownloads: 3, earningsCentavos: 600 });
    expect(quota?.downloads).toHaveLength(3);
    expect(new Set(quota?.downloads?.map((record) => record.id.toString())).size).toBe(3);
    expect(quota?.downloads?.every((record) => record.earningsCentavos === 200)).toBe(true);
    expect(await bookAffiliatePage(vet.user._id, 1)).toMatchObject({
      earningsCentavos: 600,
      downloads: 3,
    });
  });
  it('preserves lifetime earnings across month resets while showing only the current month total', async () => {
    const vet = await account('professional');
    const reader = await account('user');
    const book = await seed(vet.user._id);
    const userId = reader.user._id.toString();
    const bookId = book._id.toString();
    const december = new Date('2026-12-31T15:59:59Z');
    const january = new Date('2026-12-31T16:00:00Z');
    for (let i = 0; i < 3; i++) await recordBookCommission(userId, bookId, december, vet.user._id);
    await recordBookCommission(userId, bookId, january, vet.user._id);
    const summary = await bookAffiliatePage(vet.user._id, 1, january);
    expect(summary).toMatchObject({
      earningsCentavos: 800,
      monthEarningsCentavos: 200,
      downloads: 4,
    });
    expect(summary.items[0]).toMatchObject({ earningsCentavos: 800, downloads: 4 });
    expect(await bookAffiliatePage(vet.user._id, 1, january)).toEqual(summary);
  });
  it('protects affiliate data using the current stored professional role', async () => {
    expect((await request(app).get('/api/v1/books/affiliate')).status).toBe(401);
    for (const role of ['user', 'admin'] as const) {
      const actor = await account(role);
      expect(
        (await request(app).get('/api/v1/books/affiliate').auth(actor.token, { type: 'bearer' }))
          .status
      ).toBe(403);
    }
    const vet = await account('professional');
    expect(
      (
        await request(app)
          .get('/api/v1/books/affiliate?page=100000')
          .auth(vet.token, { type: 'bearer' })
      ).status
    ).toBe(400);
    await updateUser(vet.user._id, { role: 'user' });
    expect(
      (await request(app).get('/api/v1/books/affiliate').auth(vet.token, { type: 'bearer' })).status
    ).toBe(403);
  });
  it('paginates books without changing the earnings totals and starts old quotas at zero earnings', async () => {
    const vet = await account('professional');
    const reader = await account('user');
    const books = await Promise.all(Array.from({ length: 13 }, () => seed(vet.user._id)));
    const book = books[0];
    await quotasCollection().insertOne({
      _id: `${reader.user._id}:${book._id}:${bookMonth().key}`,
      used: 1,
    });
    expect(await bookAffiliatePage(vet.user._id, 1)).toMatchObject({
      earningsCentavos: 0,
      downloads: 0,
    });
    await recordBookCommission(
      reader.user._id.toString(),
      book._id.toString(),
      new Date(),
      vet.user._id
    );
    const first = await bookAffiliatePage(vet.user._id, 1);
    const second = await bookAffiliatePage(vet.user._id, 2);
    expect(first).toMatchObject({ pages: 2, earningsCentavos: 200, downloads: 1 });
    expect(second).toMatchObject({ page: 2, pages: 2, earningsCentavos: 200, downloads: 1 });
    expect(first.items).toHaveLength(12);
    expect(second.items).toHaveLength(1);
  });
});
