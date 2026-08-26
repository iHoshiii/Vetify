import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../../../app';
import { auditLogsCollection } from '../../../../models/audit-log';
import {
  insertProfessionalInquiry,
  professionalInquiriesCollection,
  updateProfessionalInquiry,
  type ProfessionalInquiryAttrs,
} from '../../../../models/professional-inquiries';
import { hashToken } from '../../../../models/refresh-token/utils';
import { insertUser, type UserRole } from '../../../../models/users';
import { signAccessToken } from '../../../../services/auth.service';
import { clearRecentMail, recentMail } from '../../../../services/mail.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../../test-utils/db';

const app = createApp();

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);
beforeEach(clearRecentMail);

let seq = 0;

/** An account of the given role, plus a token that says so. */
async function account(role: UserRole = 'admin', email?: string) {
  seq += 1;
  const address = email ?? `staff${seq}@example.com`;
  const user = await insertUser({
    email: address,
    password: 'Sup3rSecret!',
    name: `Staff ${seq}`,
    provider: 'local',
    role,
  });

  return { user, token: signAccessToken({ sub: user._id.toString(), email: address, role }) };
}

/** An enquiry waiting on a reviewer. */
async function enquiry(overrides: Partial<ProfessionalInquiryAttrs> = {}) {
  seq += 1;
  return await insertProfessionalInquiry({
    name: `Marites Reyes ${seq}`,
    email: `enquirer${seq}@example.com`,
    licenseNumber: `VET-${seq}`,
    currentLocation: 'Cebu City, Cebu',
    clinicLocation: 'Mandaue, Cebu',
    motivation: 'Fifteen years of small animal practice and nowhere to write any of it down.',
    ...overrides,
  });
}

const REASON = 'The licence number is not on the board register for that authority.';

function auditRows() {
  return auditLogsCollection().find({}).sort({ createdAt: 1 }).toArray();
}

/** The token out of the link, which is the only place the raw one ever appears. */
function tokenFrom(link: string) {
  return link.split('/').pop() ?? '';
}

describe('GET /api/v1/admin/inquiries', () => {
  it('turns away a caller with no token', async () => {
    const res = await request(app).get('/api/v1/admin/inquiries');

    expect(res.status).toBe(401);
  });

  it('turns away a signed-in vet, who is not a reviewer', async () => {
    const { token } = await account('professional');

    const res = await request(app)
      .get('/api/v1/admin/inquiries')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('forbidden');
  });

  it('opens on the enquiries nobody has answered yet', async () => {
    const admin = await account();
    const waiting = await enquiry();
    const answered = await enquiry();
    await updateProfessionalInquiry(answered._id, {
      status: 'declined',
      openEmail: null,
      declineReason: REASON,
    });

    const res = await request(app)
      .get('/api/v1/admin/inquiries')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      id: waiting._id.toString(),
      status: 'pending',
      inviteLive: false,
      inviteCount: 0,
    });
    expect(res.body).toMatchObject({ page: 1, total: 1, pages: 1 });
  });

  it('searches the three strings a reviewer has at this stage', async () => {
    const admin = await account();
    await enquiry({ name: 'Marites Reyes', email: 'marites@clinic.ph' });
    await enquiry({ name: 'Someone Else', email: 'else@example.com' });

    const byEmail = await request(app)
      .get('/api/v1/admin/inquiries?q=clinic.ph')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(byEmail.status).toBe(200);
    expect(byEmail.body.items).toHaveLength(1);
    expect(byEmail.body.items[0].name).toBe('Marites Reyes');
  });

  it('refuses a page size above the cap', async () => {
    const admin = await account();

    const res = await request(app)
      .get('/api/v1/admin/inquiries?limit=5000')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(400);
    expect(res.body.issues.limit).toBeTruthy();
  });
});

describe('GET /api/v1/admin/inquiries/:id', () => {
  it('returns the one box the decision is made on', async () => {
    const admin = await account();
    const waiting = await enquiry({
      motivation: 'A reason long enough to be worth reading twice.',
    });

    const res = await request(app)
      .get(`/api/v1/admin/inquiries/${waiting._id.toString()}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: waiting._id.toString(),
      motivation: 'A reason long enough to be worth reading twice.',
      currentLocation: 'Cebu City, Cebu',
    });
    // The hash is the server's business, not the screen's.
    expect(res.body.inviteTokenHash).toBeUndefined();
  });

  it('answers 404 for a malformed id rather than throwing', async () => {
    const admin = await account();

    const res = await request(app)
      .get('/api/v1/admin/inquiries/not-an-id')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(404);
  });

  it('answers 404 for an enquiry that does not exist', async () => {
    const admin = await account();

    const res = await request(app)
      .get(`/api/v1/admin/inquiries/${new ObjectId().toString()}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/admin/inquiries/:id/invite', () => {
  function invite(id: string, token: string, body: Record<string, unknown> = {}) {
    return request(app)
      .patch(`/api/v1/admin/inquiries/${id}/invite`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  it('emails the link, keeps only its hash, and hands the raw one back once', async () => {
    const admin = await account();
    const waiting = await enquiry();

    const res = await invite(waiting._id.toString(), admin.token, {
      note: 'Bring the board certificate to the interview.',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ delivered: true, deliveryError: null });
    expect(res.body.inquiry).toMatchObject({
      status: 'invited',
      inviteLive: true,
      inviteCount: 1,
      inviteNote: 'Bring the board certificate to the interview.',
    });

    const link = res.body.link as string;
    const mail = recentMail().at(-1);
    expect(mail?.to).toBe(waiting.email);
    expect(mail?.text).toContain(link);

    // The row holds a hash. A token in a log line cannot be turned back into one.
    const stored = await professionalInquiriesCollection().findOne({ _id: waiting._id });
    expect(stored?.inviteTokenHash).toBe(hashToken(tokenFrom(link)));
    expect(JSON.stringify(stored)).not.toContain(tokenFrom(link));

    const rows = await auditRows();
    expect(rows.map((row) => row.action)).toEqual(['professional.invited']);
    expect(rows[0].actor?.toString()).toBe(admin.user._id.toString());
  });

  it('resends by retiring the first link rather than adding a second', async () => {
    const admin = await account();
    const waiting = await enquiry();

    const first = await invite(waiting._id.toString(), admin.token);
    const second = await invite(waiting._id.toString(), admin.token);

    expect(second.status).toBe(200);
    expect(second.body.inquiry.inviteCount).toBe(2);
    expect(second.body.link).not.toBe(first.body.link);

    // The link that went astray stops working; the new one opens the form.
    const dead = await request(app).get(
      `/api/v1/professionals/invites/${tokenFrom(first.body.link)}`
    );
    expect(dead.status).toBe(404);

    const live = await request(app).get(
      `/api/v1/professionals/invites/${tokenFrom(second.body.link)}`
    );
    expect(live.status).toBe(200);
  });

  it('refuses a reviewer inviting their own enquiry', async () => {
    const admin = await account('admin', 'reviewer@example.com');
    const own = await enquiry({ email: 'reviewer@example.com' });

    const res = await invite(own._id.toString(), admin.token);

    expect(res.status).toBe(403);
    expect(await auditRows()).toHaveLength(0);
    expect(recentMail()).toHaveLength(0);
  });

  it('refuses an enquiry that has already become an application', async () => {
    const admin = await account();
    const spent = await enquiry();
    await updateProfessionalInquiry(spent._id, {
      status: 'completed',
      openEmail: null,
      completedAt: new Date(),
      application: new ObjectId(),
    });

    const res = await invite(spent._id.toString(), admin.token);

    expect(res.status).toBe(409);
  });

  it('refuses to reopen a declined enquiry, which is what writing in again is for', async () => {
    const admin = await account();
    const declined = await enquiry();
    await updateProfessionalInquiry(declined._id, {
      status: 'declined',
      openEmail: null,
      declineReason: REASON,
    });

    const res = await invite(declined._id.toString(), admin.token);

    expect(res.status).toBe(409);
  });

  it('answers 404 for a malformed id', async () => {
    const admin = await account();

    const res = await invite('not-an-id', admin.token);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/admin/inquiries/:id/decline', () => {
  function decline(id: string, token: string, body: Record<string, unknown>) {
    return request(app)
      .patch(`/api/v1/admin/inquiries/${id}/decline`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  it('closes the enquiry, frees the address, and keeps the reason to itself', async () => {
    const admin = await account();
    const waiting = await enquiry();

    const res = await decline(waiting._id.toString(), admin.token, { reason: REASON });

    expect(res.status).toBe(200);
    expect(res.body.inquiry).toMatchObject({ status: 'declined', declineReason: REASON });
    expect(res.body).toMatchObject({ delivered: true, deliveryError: null });

    const mail = recentMail().at(-1);
    expect(mail?.to).toBe(waiting.email);
    // Written to a colleague, not to a stranger: the email says only that the
    // enquiry was not taken further.
    expect(mail?.text).not.toContain('board register');
    expect(mail?.html).not.toContain('board register');

    // The row stays, because the same person may write in again and this is
    // context; the address is what gets released.
    const stored = await professionalInquiriesCollection().findOne({ _id: waiting._id });
    expect(stored?.openEmail).toBeNull();

    const rows = await auditRows();
    expect(rows.map((row) => row.action)).toEqual(['professional.inquiry.declined']);
  });

  it('refuses a decline with no reason, and records nothing', async () => {
    const admin = await account();
    const waiting = await enquiry();

    const res = await decline(waiting._id.toString(), admin.token, {});

    expect(res.status).toBe(400);
    expect(await auditRows()).toHaveLength(0);
    expect(recentMail()).toHaveLength(0);
  });

  it('refuses a reason too short to explain anything', async () => {
    const admin = await account();
    const waiting = await enquiry();

    const res = await decline(waiting._id.toString(), admin.token, { reason: 'no' });

    expect(res.status).toBe(400);
  });

  it('answers 404 for an enquiry that does not exist', async () => {
    const admin = await account();

    const res = await decline(new ObjectId().toString(), admin.token, { reason: REASON });

    expect(res.status).toBe(404);
  });
});
