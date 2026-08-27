import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  auditLogsCollection,
  findProfessionalInquiryById,
  hashToken,
  insertProfessionalInquiry,
  insertUser,
  professionalInquiriesCollection,
  type ProfessionalInquiryAttrs,
  type User,
} from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { clearRecentMail, recentMail } from '../mail.service';
import {
  completeInquiry,
  declineInquiry,
  inviteInquiry,
  readInvite,
} from '../professional-inquiries.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);
beforeEach(clearRecentMail);

let seq = 0;

async function admin(): Promise<User> {
  seq += 1;
  return await insertUser({
    email: `admin${seq}@example.com`,
    password: 'pw12345678',
    name: `Admin ${seq}`,
    role: 'admin',
  });
}

async function enquiry(overrides: Partial<ProfessionalInquiryAttrs> = {}) {
  seq += 1;
  return await insertProfessionalInquiry({
    name: 'Marites Reyes',
    email: `vet${seq}@example.com`,
    licenseNumber: `VET-${seq}`,
    currentLocation: 'Cebu City, Cebu',
    clinicLocation: 'Mandaue, Cebu',
    motivation: 'Fifteen years of small animal practice and nowhere to write it down.',
    ...overrides,
  });
}

/** The last message the outbox saw, which the log transport never sends. */
function lastMail() {
  return recentMail().at(-1);
}

describe('inviteInquiry', () => {
  it('mints a link, keeps only its hash, and emails it', async () => {
    const reviewer = await admin();
    const filed = await enquiry();

    const result = await inviteInquiry({ id: filed._id, reviewer, note: 'Bring the PRC card.' });

    expect(result?.inquiry.status).toBe('invited');
    expect(result?.inquiry.inviteCount).toBe(1);
    expect(result?.inquiry.inviteNote).toBe('Bring the PRC card.');
    expect(result?.delivered).toBe(true);

    const token = result?.link.split('/').at(-1) ?? '';
    expect(token).toHaveLength(64);
    expect(result?.inquiry.inviteTokenHash).toBe(hashToken(token));
    // The row must not hold anything that could be pasted into a browser.
    expect(JSON.stringify(result?.inquiry)).not.toContain(token);

    expect(lastMail()?.to).toBe(filed.email);
    expect(lastMail()?.text).toContain(result?.link);
    expect(lastMail()?.text).toContain('Bring the PRC card.');
    expect(lastMail()?.html).toContain(`<a href="${result?.link}"`);
  });

  it('leaves an audit entry naming the reviewer', async () => {
    const reviewer = await admin();
    const filed = await enquiry();

    await inviteInquiry({ id: filed._id, reviewer, ip: '203.0.113.7' });

    const entry = await auditLogsCollection().findOne({ action: 'professional.invited' });
    expect(entry?.targetType).toBe('professional-inquiry');
    expect(entry?.targetId?.toString()).toBe(filed._id.toString());
    expect(entry?.actorEmail).toBe(reviewer.email);
    expect(entry?.metadata).toMatchObject({ licenseNumber: filed.licenseNumber, delivered: true });
    expect(entry?.ip).toBe('203.0.113.7');
  });

  it('resends as a new token, retiring the first one', async () => {
    const reviewer = await admin();
    const filed = await enquiry();

    const first = await inviteInquiry({ id: filed._id, reviewer });
    const second = await inviteInquiry({ id: filed._id, reviewer });

    expect(second?.link).not.toBe(first?.link);
    expect(second?.inquiry.inviteCount).toBe(2);

    const firstToken = first?.link.split('/').at(-1) ?? '';
    await expect(readInvite(firstToken)).resolves.toEqual({ ok: false, reason: 'not-found' });
    await expect(readInvite(second?.link.split('/').at(-1) ?? '')).resolves.toMatchObject({
      ok: true,
    });
  });

  it('refuses to invite an enquiry the reviewer filed themselves', async () => {
    const reviewer = await admin();
    const filed = await enquiry({ email: reviewer.email });

    await expect(inviteInquiry({ id: filed._id, reviewer })).rejects.toThrow(/your own enquiry/);
  });

  it('answers null for an enquiry that does not exist', async () => {
    const reviewer = await admin();

    await expect(inviteInquiry({ id: new ObjectId(), reviewer })).resolves.toBeNull();
  });
});

describe('readInvite', () => {
  it('reports an expired link as expired, not as missing', async () => {
    const reviewer = await admin();
    const filed = await enquiry();
    const invited = await inviteInquiry({ id: filed._id, reviewer });
    const token = invited?.link.split('/').at(-1) ?? '';

    await professionalInquiriesCollection().updateOne(
      { _id: filed._id },
      { $set: { inviteExpiresAt: new Date(Date.now() - 1000) } }
    );

    await expect(readInvite(token)).resolves.toEqual({ ok: false, reason: 'expired' });
  });

  it('reports a link pulled by a later decline as withdrawn', async () => {
    const reviewer = await admin();
    const filed = await enquiry();
    const invited = await inviteInquiry({ id: filed._id, reviewer });

    await declineInquiry({ id: filed._id, reviewer, reason: 'Licence not on the PRC roll' });

    const token = invited?.link.split('/').at(-1) ?? '';
    await expect(readInvite(token)).resolves.toEqual({ ok: false, reason: 'withdrawn' });
  });

  it('reports a spent link as used once the application is filed', async () => {
    const reviewer = await admin();
    const filed = await enquiry();
    const invited = await inviteInquiry({ id: filed._id, reviewer });
    const application = new ObjectId();

    const completed = await completeInquiry(filed._id, application);

    expect(completed?.status).toBe('completed');
    expect(completed?.openEmail).toBeNull();
    expect(completed?.application?.toString()).toBe(application.toString());

    const token = invited?.link.split('/').at(-1) ?? '';
    await expect(readInvite(token)).resolves.toEqual({ ok: false, reason: 'used' });
  });

  it('reports an invented token as missing', async () => {
    await expect(readInvite('a'.repeat(64))).resolves.toEqual({ ok: false, reason: 'not-found' });
  });
});

describe('declineInquiry', () => {
  it('closes the enquiry, frees the address, and keeps the reason off the email', async () => {
    const reviewer = await admin();
    const filed = await enquiry();

    const result = await declineInquiry({
      id: filed._id,
      reviewer,
      reason: 'Licence number not found on the PRC roll',
    });

    expect(result?.inquiry.status).toBe('declined');
    expect(result?.inquiry.openEmail).toBeNull();
    expect(result?.inquiry.declineReason).toBe('Licence number not found on the PRC roll');
    expect(result?.delivered).toBe(true);

    // The reason is written for the audit log and the queue, not for the applicant.
    expect(lastMail()?.to).toBe(filed.email);
    expect(lastMail()?.text).not.toContain('PRC roll');

    const entry = await auditLogsCollection().findOne({ action: 'professional.inquiry.declined' });
    expect(entry?.reason).toBe('Licence number not found on the PRC roll');
    expect(entry?.metadata).toMatchObject({ wasInvited: false });
  });

  it('lets the same address file a fresh enquiry afterwards', async () => {
    const reviewer = await admin();
    const filed = await enquiry({ email: 'again@example.com' });
    await declineInquiry({ id: filed._id, reviewer, reason: 'Too far outside our areas' });

    const second = await enquiry({ email: 'again@example.com' });

    expect(second._id.toString()).not.toBe(filed._id.toString());
    expect(second.status).toBe('pending');
  });

  it('insists on a reason', async () => {
    const reviewer = await admin();
    const filed = await enquiry();

    await expect(declineInquiry({ id: filed._id, reviewer, reason: '   ' })).rejects.toThrow(
      /reason is required/
    );
    expect(await findProfessionalInquiryById(filed._id)).toMatchObject({ status: 'pending' });
  });

  it('will not reopen a decline through a second invitation', async () => {
    const reviewer = await admin();
    const filed = await enquiry();
    await declineInquiry({ id: filed._id, reviewer, reason: 'Not this time' });

    await expect(inviteInquiry({ id: filed._id, reviewer })).rejects.toThrow(/write in again/);
  });

  it('refuses to touch an enquiry that already became an application', async () => {
    const reviewer = await admin();
    const filed = await enquiry();
    await completeInquiry(filed._id, new ObjectId());

    await expect(
      declineInquiry({ id: filed._id, reviewer, reason: 'Changed my mind' })
    ).rejects.toThrow(/already been turned into an application/);
    await expect(inviteInquiry({ id: filed._id, reviewer })).rejects.toThrow(
      /already been turned into an application/
    );
  });
});
