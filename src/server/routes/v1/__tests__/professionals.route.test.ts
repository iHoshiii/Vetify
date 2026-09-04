import { randomBytes } from 'node:crypto';

import { PROFESSIONAL_NEAR_RADIUS_KM } from '@shared/limits';
import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import { activityEventsCollection, flushActivity } from '../../../models/activity-event';
import { hashToken } from '../../../models/refresh-token/utils';
import {
  insertProfessionalInquiry,
  professionalInquiriesCollection,
  updateProfessionalInquiry,
  type ProfessionalInquiryAttrs,
  type ProfessionalInquiryPatch,
} from '../../../models/professional-inquiries';
import {
  insertProfessional,
  publishPinnedAddresses,
  updateAddressMap,
  updateProfessional,
  updateProfessionalProfile,
  type ProfessionalAttrs,
  type ProfessionalProfilePatch,
} from '../../../models/professionals';
import { insertUser, type UserRole, type UserStatus } from '../../../models/users';
import { signAccessToken } from '../../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let seq = 0;

/**
 * A capture as the camera hands it over: raw base64, JPEG, taken just now.
 *
 * "Just now" is the part that matters. The schema refuses a capture more than two
 * hours old, so a fixture with a fixed timestamp would start failing on its own.
 */
function photo() {
  return {
    data: 'Zm9yLXRlc3RzLW9uZS1qcGVnLXBsZWFzZQ==',
    mimeType: 'image/jpeg',
    capturedAt: new Date().toISOString(),
  };
}

/** A valid application body, as the second form would send it. */
function form(overrides: Record<string, unknown> = {}) {
  seq += 1;
  return {
    fullName: `Marites Reyes ${seq}`,
    licenseNumber: `vet-${seq}`,
    licenseAuthority: 'Professional Regulation Commission',
    credentialUrls: ['https://example.com/licence.pdf'],
    specialties: ['Dentistry', 'dentistry', 'Surgery'],
    clinicName: 'Bayside Animal Clinic',
    businessPhone: '+63 32 555 0101',
    addresses: [
      {
        kind: 'clinic',
        line1: '12 Mabini Street',
        city: 'Cebu City',
        province: 'Cebu',
        postalCode: '6000',
      },
    ],
    portrait: photo(),
    licenseFront: photo(),
    licenseBack: photo(),
    bio: 'Small animal practice for fifteen years, mostly dentistry and soft tissue surgery work.',
    yearsExperience: 15,
    backgroundCheckConsent: true,
    ...overrides,
  };
}

/** The public first form, as a stranger would send it. */
function inquiryForm(overrides: Record<string, unknown> = {}) {
  seq += 1;
  return {
    name: `Marites Reyes ${seq}`,
    email: `enquirer${seq}@example.com`,
    // Six digits, because the automatic screen refuses a licence number with fewer
    // than four: an enquiry built on `vet-1` is declined the moment it arrives, and
    // the tests below that need an open one would silently stop testing anything.
    licenseNumber: `vet ${900000 + seq}-ph`,
    currentLocation: 'Cebu City, Cebu',
    clinicLocation: 'Mandaue, Cebu',
    motivation: 'Fifteen years of small animal practice and nowhere to write any of it down.',
    phone: '+63 32 555 0101',
    ...overrides,
  };
}

/** An account of the given role and status, plus a token that says so. */
async function account(role: UserRole = 'user', status: UserStatus = 'active') {
  seq += 1;
  const user = await insertUser({
    email: `vet${seq}@example.com`,
    password: 'Sup3rSecret!',
    name: `Dr Vet ${seq}`,
    provider: 'local',
    role,
    status,
  });

  return {
    user,
    token: signAccessToken({ sub: user._id.toString(), email: user.email, role }),
  };
}

/** An enquiry on the queue, pending review. */
async function enquiry(overrides: Partial<ProfessionalInquiryAttrs> = {}) {
  seq += 1;
  return await insertProfessionalInquiry({
    name: 'Marites Reyes',
    email: `enquirer${seq}@example.com`,
    licenseNumber: `VET-${seq}`,
    currentLocation: 'Cebu City, Cebu',
    motivation: 'Fifteen years of small animal practice and nowhere to write any of it down.',
    ...overrides,
  });
}

/**
 * An invited enquiry and the raw token that opens it.
 *
 * The invitation is written here rather than through `inviteInquiry`, so a test can
 * hand itself an expired or withdrawn link without waiting a fortnight or driving
 * the admin surface to get one.
 */
async function invited(email: string, patch: ProfessionalInquiryPatch = {}) {
  const pending = await enquiry({ email });
  const token = randomBytes(32).toString('hex');

  const inquiry = await updateProfessionalInquiry(pending._id, {
    status: 'invited',
    inviteTokenHash: hashToken(token),
    inviteExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    invitedAt: new Date(),
    inviteCount: 1,
    reviewedBy: new ObjectId(),
    reviewedAt: new Date(),
    ...patch,
  });

  if (!inquiry) throw new Error('the fixture failed to invite its own enquiry');
  return { inquiry, token };
}

/** An application already filed, by default pending. */
async function seed(user: ObjectId, overrides: Partial<ProfessionalAttrs> = {}) {
  seq += 1;
  return await insertProfessional({
    user,
    fullName: `Seed Vet ${seq}`,
    licenseNumber: `SEED-${seq}`,
    licenseAuthority: 'Professional Regulation Commission',
    credentialUrls: ['https://example.com/licence.pdf'],
    specialties: ['surgery'],
    clinicName: 'Seed Veterinary',
    addresses: [
      {
        kind: 'clinic',
        line1: '9 Rizal Avenue',
        city: 'Cebu City',
        province: 'Cebu',
        postalCode: '6000',
        fix: null,
      },
    ],
    businessPhone: '+63 32 555 0202',
    bio: 'A practice long enough established to have a listing worth reading.',
    yearsExperience: 8,
    backgroundCheckConsent: true,
    ...overrides,
  });
}

/** A verified vet in the directory, owned by a real active account. */
async function listed(
  overrides: Partial<ProfessionalAttrs> = {},
  /**
   * The settings a vet chooses after verification. Separate because
   * `insertProfessional` deliberately writes none of them: they are not part of a
   * filed application, and the filters below are the first thing that reads them.
   */
  settings: ProfessionalProfilePatch = {}
) {
  const { user } = await account('professional');
  const application = await seed(user._id, overrides);

  if (Object.keys(settings).length > 0) {
    await updateProfessionalProfile(application._id, settings);
  }

  return await updateProfessional(application._id, {
    status: 'verified',
    reviewedBy: new ObjectId(),
    reviewedAt: new Date(),
  });
}

/** The short first form, posted the way a signed-in visitor's page sends it. */
function enquire(auth: string, body: Record<string, unknown>) {
  return request(app)
    .post('/api/v1/professionals/inquiries')
    .set('Authorization', `Bearer ${auth}`)
    .send(body);
}

/** The application form, posted through an invitation the way the page does it. */
function apply(token: string, auth: string, body: Record<string, unknown>) {
  return request(app)
    .post(`/api/v1/professionals/invites/${token}/apply`)
    .set('Authorization', `Bearer ${auth}`)
    .send(body);
}

/** An applicant with a live link addressed to them, which is the common setup. */
async function ready() {
  const applicant = await account();
  const { inquiry, token } = await invited(applicant.user.email);
  return { applicant, inquiry, token };
}

describe('GET /api/v1/professionals', () => {
  it('lists verified vets without the licence material a reviewer sees', async () => {
    await listed({ clinicName: 'Listed Veterinary' });
    const pending = await account();
    await seed(pending.user._id, { clinicName: 'Not reviewed yet' });

    const res = await request(app).get('/api/v1/professionals');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].clinicName).toBe('Listed Veterinary');
    // The directory is a place to choose a vet, not to audit one.
    expect(res.body.items[0].licenseNumber).toBeUndefined();
    expect(res.body.items[0].credentialUrls).toBeUndefined();
    expect(res.body.items[0].name).toBeTruthy();
    expect(res.body).toMatchObject({ page: 1, total: 1, pages: 1 });
  });

  it('filters by specialty', async () => {
    await listed({ specialties: ['dentistry'], clinicName: 'Teeth first' });
    await listed({ specialties: ['surgery'], clinicName: 'Surgery only' });

    const res = await request(app).get('/api/v1/professionals?specialty=Dentistry');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].clinicName).toBe('Teeth first');
  });

  it('refuses an oversized page instead of quietly clamping it', async () => {
    const res = await request(app).get('/api/v1/professionals?limit=100000');

    expect(res.status).toBe(400);
    expect(res.body.issues.limit).toBeTruthy();
  });

  it('searches the name on the licence', async () => {
    await listed({ fullName: 'Marites Reyes', clinicName: 'One clinic' });
    await listed({ fullName: 'Danilo Cruz', clinicName: 'Another clinic' });

    const res = await request(app).get('/api/v1/professionals?q=marites');

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].clinicName).toBe('One clinic');
  });

  it('searches a home street, for a vet with no clinic to search instead', async () => {
    await listed({
      clinicName: null,
      addresses: [
        {
          kind: 'home',
          line1: '44 Sikatuna Street',
          city: 'Dumaguete',
          province: 'Negros Oriental',
          postalCode: '6200',
          fix: {
            latitude: 9.3,
            longitude: 123.3,
            accuracyMeters: 12,
            capturedAt: new Date().toISOString(),
          },
        },
      ],
    });
    await listed({ clinicName: 'Somewhere else entirely' });

    const res = await request(app).get('/api/v1/professionals?q=sikatuna');

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].addresses[0].line1).toBe('44 Sikatuna Street');
    // The address is published; the device reading it was verified with is not. That
    // says where a phone was on the day somebody applied, to within twelve metres.
    expect(res.body.items[0].addresses[0].fix).toBeUndefined();
  });

  it('filters by what somebody can afford', async () => {
    await listed({ clinicName: 'Affordable' }, { hourlyRate: 40 });
    await listed({ clinicName: 'Dear' }, { hourlyRate: 400 });

    const res = await request(app).get('/api/v1/professionals?maxRate=100');

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].clinicName).toBe('Affordable');
  });

  it('filters by years on the licence', async () => {
    await listed({ clinicName: 'Long established', yearsExperience: 20 });
    await listed({ clinicName: 'Newly qualified', yearsExperience: 2 });

    const res = await request(app).get('/api/v1/professionals?minExperience=10');

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].clinicName).toBe('Long established');
  });

  it('shows only the vets taking bookings when asked', async () => {
    await listed({ clinicName: 'Open' }, { availabilityStatus: 'available' });
    await listed({ clinicName: 'Booked solid' }, { availabilityStatus: 'busy' });
    // No setting at all, which predates the field and counts as available.
    await listed({ clinicName: 'Never said' });

    const res = await request(app).get('/api/v1/professionals?available=true');

    expect(res.body.items.map((item: { clinicName: string }) => item.clinicName).sort()).toEqual([
      'Never said',
      'Open',
    ]);
  });

  it('does the opposite of nothing when told available=false', async () => {
    await listed({ clinicName: 'Booked solid' }, { availabilityStatus: 'busy' });

    // The trap `z.coerce.boolean()` walks into: every non-empty string is truthy, so
    // it would read 'false' as true and filter the row out.
    const res = await request(app).get('/api/v1/professionals?available=false');

    expect(res.body.items).toHaveLength(1);
  });
});

describe('GET /api/v1/professionals/:id', () => {
  it('answers one listing, addresses included', async () => {
    const application = await listed({ clinicName: 'The one being read' });

    const res = await request(app).get(`/api/v1/professionals/${application!._id.toString()}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ clinicName: 'The one being read' });
    expect(res.body.addresses).toHaveLength(1);
    // Same rule as the list it comes out of: a profile is a place to choose a vet.
    expect(res.body.licenseNumber).toBeUndefined();
  });

  it('answers 404 for an application that is not verified', async () => {
    const pending = await account();
    const application = await seed(pending.user._id);

    // Not 403. Somebody with a guessed id has no business learning that an
    // unverified application is behind it.
    const res = await request(app).get(`/api/v1/professionals/${application._id.toString()}`);

    expect(res.status).toBe(404);
  });

  it('answers 404 once the account behind a listing is suspended', async () => {
    const { user } = await account('professional', 'suspended');
    const application = await seed(user._id);
    await updateProfessional(application._id, { status: 'verified', reviewedAt: new Date() });

    // The list drops these with a $match after its join; one row has to apply the
    // same rule, or a delisted profile stays reachable by its old link.
    const res = await request(app).get(`/api/v1/professionals/${application._id.toString()}`);

    expect(res.status).toBe(404);
  });

  it('answers a malformed id without asking the database', async () => {
    const res = await request(app).get('/api/v1/professionals/not-an-id');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/professionals/inquiries', () => {
  it('refuses an enquiry from nobody in particular', async () => {
    const res = await request(app).post('/api/v1/professionals/inquiries').send(inquiryForm());

    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('unauthenticated');
    // And leaves nothing on the queue for a reviewer to read.
    expect(await professionalInquiriesCollection().countDocuments({})).toBe(0);
  });

  it('takes an enquiry and hands back nothing to hold', async () => {
    const sender = await account();

    const res = await enquire(
      sender.token,
      inquiryForm({ email: 'Marites@Example.COM ', licenseNumber: ' vet 9000-ph ' })
    );

    expect(res.status).toBe(201);
    // No id: the row is not tied to the account that sent it, and no endpoint but
    // the reviewer's reads one, so there is nothing the sender could open.
    expect(res.body).toEqual({ received: true });

    const stored = await professionalInquiriesCollection().findOne({
      email: 'marites@example.com',
    });
    expect(stored).toMatchObject({
      status: 'pending',
      // Normalised the same way the application normalises it, so one search finds
      // both stages.
      licenseNumber: 'VET 9000-PH',
      openEmail: 'marites@example.com',
      inviteTokenHash: null,
    });
  });

  it('holds one address to one open enquiry', async () => {
    const sender = await account();
    const first = inquiryForm();
    await enquire(sender.token, first);

    const res = await enquire(
      sender.token,
      inquiryForm({
        email: first.email,
        motivation: 'Writing in a second time, in case the first one went astray somewhere.',
      })
    );

    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('inquiry-open');
  });

  it('lets a declined applicant write in again', async () => {
    const sender = await account();
    const declined = await enquiry();
    await updateProfessionalInquiry(declined._id, {
      status: 'declined',
      openEmail: null,
      declineReason: 'The licence could not be found on the board register.',
    });

    const res = await enquire(sender.token, inquiryForm({ email: declined.email }));

    expect(res.status).toBe(201);
    expect(await professionalInquiriesCollection().countDocuments({ email: declined.email })).toBe(
      2
    );
  });

  it('turns away an enquiry with no licence number, and gives nothing away doing it', async () => {
    const sender = await account();

    const res = await enquire(sender.token, inquiryForm({ licenseNumber: 'none' }));

    // The same answer a good enquiry gets. One that named the rule it tripped would
    // tell whoever is probing which field to change next.
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ received: true });

    const stored = await professionalInquiriesCollection().findOne({ licenseNumber: 'NONE' });
    expect(stored).toMatchObject({
      status: 'declined',
      // No reviewer stamped, which is what tells an automatic decline from a human
      // one on the queue and in the audit log.
      reviewedBy: null,
      openEmail: null,
    });
    expect(stored?.declineReason).toContain('Automatic:');
  });

  it('turns away somebody whose own words say they are not a vet', async () => {
    const sender = await account();
    const form = inquiryForm({
      motivation: 'I am a veterinary student and would like the exposure before I take the exam.',
    });

    const res = await enquire(sender.token, form);

    expect(res.status).toBe(201);
    expect(await professionalInquiriesCollection().findOne({ email: form.email })).toMatchObject({
      status: 'declined',
      reviewedBy: null,
    });
  });

  it('frees the address on its way out, so a wrong rule can be written past', async () => {
    const sender = await account();
    const first = inquiryForm({ licenseNumber: 'n/a' });
    await enquire(sender.token, first);

    // Not the 409 an open enquiry would earn: the automatic decline nulled
    // `openEmail` on its way out, which is what makes a bad rule survivable for the
    // person it was applied to.
    const res = await enquire(sender.token, inquiryForm({ email: first.email }));

    expect(res.status).toBe(201);
    expect(await professionalInquiriesCollection().countDocuments({ email: first.email })).toBe(2);
  });

  it('takes an enquiry that gives the clinic address and no home one', async () => {
    const sender = await account();
    const form = inquiryForm({ currentLocation: '' });

    const res = await enquire(sender.token, form);

    expect(res.status).toBe(201);
    // Nothing stands in for the address that was not given, so a reviewer sees which is which
    expect(await professionalInquiriesCollection().findOne({ email: form.email })).toMatchObject({
      currentLocation: null,
      clinicLocation: 'Mandaue, Cebu',
    });
  });

  it('refuses an enquiry that gives neither address', async () => {
    const sender = await account();

    const res = await enquire(
      sender.token,
      inquiryForm({ currentLocation: '', clinicLocation: '' })
    );

    expect(res.status).toBe(400);
    expect(res.body.issues.currentLocation).toBeTruthy();
    expect(res.body.issues.clinicLocation).toBeTruthy();
  });

  it('refuses an enquiry with nothing in the one box a reviewer reads', async () => {
    const sender = await account();

    const res = await enquire(sender.token, inquiryForm({ motivation: 'i want in' }));

    expect(res.status).toBe(400);
    expect(res.body.issues.motivation).toBeTruthy();
  });
});

describe('GET /api/v1/professionals/invites/:token', () => {
  it('opens the form with what the enquiry already said, and nothing more', async () => {
    const { token } = await invited('maria@example.com');

    const res = await request(app).get(`/api/v1/professionals/invites/${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Marites Reyes',
      email: 'maria@example.com',
      currentLocation: 'Cebu City, Cebu',
    });
    expect(res.body.expiresAt).toBeTruthy();
    // The token is the whole credential, so the summary carries nothing a reviewer
    // wrote or the applicant would not already know.
    expect(res.body.motivation).toBeUndefined();
    expect(res.body.status).toBeUndefined();
    expect(res.body.inviteNote).toBeUndefined();
  });

  it('does not read the database for a token of the wrong shape', async () => {
    const res = await request(app).get('/api/v1/professionals/invites/not-a-token');

    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('not-found');
  });

  it('answers a well-formed link that was never ours the same way', async () => {
    const res = await request(app).get(
      `/api/v1/professionals/invites/${randomBytes(32).toString('hex')}`
    );

    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('not-found');
  });

  it('tells an expired link apart from an invented one', async () => {
    const { token } = await invited('late@example.com', {
      inviteExpiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app).get(`/api/v1/professionals/invites/${token}`);

    // Gone rather than missing: the link was real, and only this reason is worth
    // asking for a resend over.
    expect(res.status).toBe(410);
    expect(res.body.reason).toBe('expired');
  });

  it('reports a withdrawn invitation as withdrawn', async () => {
    const { inquiry, token } = await invited('withdrawn@example.com');
    await updateProfessionalInquiry(inquiry._id, {
      status: 'declined',
      openEmail: null,
      declineReason: 'Turned out the licence belongs to somebody else.',
    });

    const res = await request(app).get(`/api/v1/professionals/invites/${token}`);

    expect(res.status).toBe(410);
    expect(res.body.reason).toBe('withdrawn');
  });

  it('reports a spent link as used', async () => {
    const { inquiry, token } = await invited('done@example.com');
    await updateProfessionalInquiry(inquiry._id, {
      status: 'completed',
      openEmail: null,
      completedAt: new Date(),
      application: new ObjectId(),
    });

    const res = await request(app).get(`/api/v1/professionals/invites/${token}`);

    expect(res.status).toBe(410);
    expect(res.body.reason).toBe('used');
  });
});

describe('POST /api/v1/professionals/invites/:token/apply', () => {
  it('turns an anonymous application away even with a good link', async () => {
    const { token } = await invited('maria@example.com');

    const res = await request(app)
      .post(`/api/v1/professionals/invites/${token}/apply`)
      .send(form());

    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('unauthenticated');
  });

  it('files the application, spends the link, and keeps the photographs elsewhere', async () => {
    const { applicant, inquiry, token } = await ready();

    const res = await apply(token, applicant.token, {
      ...form({ licenseNumber: ' vet 9000-ph ' }),
      // A payload naming somebody else as the applicant. The schema has no `user`
      // field, so this is dropped rather than honoured.
      user: new ObjectId().toString(),
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      userId: applicant.user._id.toString(),
      status: 'pending',
      licenseNumber: 'VET 9000-PH',
      // Deduped and lowercased on the way in, so the directory filter has one
      // spelling to match.
      specialties: ['dentistry', 'surgery'],
    });
    // Three ids, no bytes: the row a reviewer lists stays small.
    expect(Object.keys(res.body.captures).sort()).toEqual([
      'licenseBack',
      'licenseFront',
      'portrait',
    ]);
    expect(res.body.portrait).toBeUndefined();
    // The verdict trail is not the applicant's business beyond the reason given.
    expect(res.body.reviewedBy).toBeUndefined();

    const spent = await professionalInquiriesCollection().findOne({ _id: inquiry._id });
    expect(spent).toMatchObject({ status: 'completed', openEmail: null });
    expect(spent?.application?.toString()).toBe(res.body.id);

    // And the same link a second time is a link that has been used.
    const again = await request(app).get(`/api/v1/professionals/invites/${token}`);
    expect(again.status).toBe(410);
    expect(again.body.reason).toBe('used');

    await flushActivity();
    expect(
      await activityEventsCollection().countDocuments({
        type: 'professional.applied',
        user: applicant.user._id,
      })
    ).toBe(1);
  });

  it('refuses a forwarded link opened by somebody else', async () => {
    const { token } = await invited('maria@example.com');
    const someoneElse = await account();

    const res = await apply(token, someoneElse.token, form());

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('invite-email-mismatch');
    // The address is in the message on purpose: the way out is signing in as her.
    expect(res.body.error).toContain('maria@example.com');
  });

  it('refuses a link that expired while the form was open', async () => {
    const applicant = await account();
    const { token } = await invited(applicant.user.email, {
      inviteExpiresAt: new Date(Date.now() - 1000),
    });

    const res = await apply(token, applicant.token, form());

    expect(res.status).toBe(410);
    expect(res.body.reason).toBe('expired');
  });

  it('refuses an application with no background-check consent', async () => {
    const { applicant, token } = await ready();

    const res = await apply(token, applicant.token, form({ backgroundCheckConsent: false }));

    expect(res.status).toBe(400);
    expect(res.body.issues.backgroundCheckConsent).toBeTruthy();
  });

  it('refuses a capture that arrives as a data URL', async () => {
    const { applicant, token } = await ready();

    const res = await apply(
      token,
      applicant.token,
      form({ portrait: { ...photo(), data: 'data:image/jpeg;base64,Zm9v' } })
    );

    expect(res.status).toBe(400);
    // `flatten` groups by the top-level field, so the nested path lands here.
    expect(res.body.issues.portrait).toBeTruthy();
  });
});

describe('POST /api/v1/professionals/invites/:token/apply, refusals that are not the payload', () => {
  it('lets an account apply only once, and leaves the link alone when it refuses', async () => {
    const { applicant, inquiry, token } = await ready();
    await seed(applicant.user._id);

    const res = await apply(token, applicant.token, form());

    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('already-applied');
    // Nothing was filed, so nothing was spent: the invitation is still open.
    const untouched = await professionalInquiriesCollection().findOne({ _id: inquiry._id });
    expect(untouched).toMatchObject({ status: 'invited', completedAt: null });
  });

  it('refuses a licence another account has already registered', async () => {
    const first = await account();
    const taken = await seed(first.user._id, { licenseNumber: 'VET 4242-PH' });
    const { applicant, token } = await ready();

    const res = await apply(
      token,
      applicant.token,
      form({ licenseNumber: taken.licenseNumber, licenseAuthority: taken.licenseAuthority })
    );

    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('license-registered');
  });

  it('turns away a banned account holding a token minted before the ban', async () => {
    const banned = await account('user', 'banned');
    const { token } = await invited(banned.user.email);

    const res = await apply(token, banned.token, form());

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('account-banned');
  });
});

describe('GET /api/v1/professionals/captures/:id', () => {
  /** An application filed through its invitation, with its capture ids. */
  async function filed() {
    const { applicant, token } = await ready();
    const res = await apply(token, applicant.token, form());
    if (res.status !== 201) throw new Error(`the fixture could not apply: ${res.status}`);

    return { applicant, captures: res.body.captures as Record<string, string> };
  }

  it('streams the photograph to the person in it, and tells nothing to cache it', async () => {
    const { applicant, captures } = await filed();

    const res = await request(app)
      .get(`/api/v1/professionals/captures/${captures.portrait}`)
      .set('Authorization', `Bearer ${applicant.token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.body).toEqual(Buffer.from('Zm9yLXRlc3RzLW9uZS1qcGVnLXBsZWFzZQ==', 'base64'));
  });

  it('lets a reviewer read it', async () => {
    const { captures } = await filed();
    const reviewer = await account('admin');

    const res = await request(app)
      .get(`/api/v1/professionals/captures/${captures.licenseFront}`)
      .set('Authorization', `Bearer ${reviewer.token}`);

    expect(res.status).toBe(200);
  });

  it("says a stranger's photograph does not exist rather than that they may not see it", async () => {
    const { captures } = await filed();
    const nosy = await account();

    const res = await request(app)
      .get(`/api/v1/professionals/captures/${captures.licenseBack}`)
      .set('Authorization', `Bearer ${nosy.token}`);

    // 403 would confirm the id names a real identity document.
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('That photograph does not exist.');
  });

  it('needs an account at all', async () => {
    const { captures } = await filed();

    const res = await request(app).get(`/api/v1/professionals/captures/${captures.portrait}`);

    expect(res.status).toBe(401);
  });

  it('answers a malformed id without asking the database', async () => {
    const reader = await account();

    const res = await request(app)
      .get('/api/v1/professionals/captures/not-an-id')
      .set('Authorization', `Bearer ${reader.token}`);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/professionals/me', () => {
  it('says so plainly when the caller has not applied', async () => {
    const applicant = await account();

    const res = await request(app)
      .get('/api/v1/professionals/me')
      .set('Authorization', `Bearer ${applicant.token}`);

    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('no-application');
  });

  it('returns the outcome and the reason for it, but not who decided', async () => {
    const applicant = await account();
    const application = await seed(applicant.user._id);
    await updateProfessional(application._id, {
      status: 'rejected',
      reviewedBy: new ObjectId(),
      rejectionReason: 'The licence number does not match the board register.',
    });

    const res = await request(app)
      .get('/api/v1/professionals/me')
      .set('Authorization', `Bearer ${applicant.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'rejected',
      rejectionReason: 'The licence number does not match the board register.',
    });
    // Stamped by the update even though the caller did not send one.
    expect(res.body.reviewedAt).toBeTruthy();
    expect(res.body.reviewedBy).toBeUndefined();
  });

  it('carries the interview once one is booked', async () => {
    const applicant = await account();
    const application = await seed(applicant.user._id);
    const at = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await updateProfessional(application._id, {
      status: 'interview',
      interviewAt: at,
      interviewNote: 'Bring the original licence card.',
    });

    const res = await request(app)
      .get('/api/v1/professionals/me')
      .set('Authorization', `Bearer ${applicant.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'interview',
      interviewAt: at.toISOString(),
      interviewNote: 'Bring the original licence card.',
    });
  });

  it('shows the applicant the photographs they filed', async () => {
    const { applicant, token } = await ready();
    const filed = await apply(token, applicant.token, form());

    const res = await request(app)
      .get('/api/v1/professionals/me')
      .set('Authorization', `Bearer ${applicant.token}`);

    expect(res.status).toBe(200);
    expect(res.body.captures).toEqual(filed.body.captures);
  });
});

/**
 * The two addresses a pin gets dropped on: a clinic that was verified with a device
 * reading, and a house that was not.
 *
 * The clinic's `fix` is the point of the fixture. It is the material the tests below
 * prove never leaves the server, and having one on the record is the only way an
 * assertion that it is absent from a response can mean anything.
 */
const CLINIC_ADDRESS = {
  kind: 'clinic' as const,
  line1: '12 Mabini Street',
  city: 'Cebu City',
  province: 'Cebu',
  postalCode: '6000',
  fix: {
    latitude: 10.3157,
    longitude: 123.8854,
    accuracyMeters: 8,
    capturedAt: '2026-01-05T02:00:00.000Z',
  },
};

const HOME_ADDRESS = {
  kind: 'home' as const,
  line1: '44 Sikatuna Street',
  city: 'Dumaguete',
  province: 'Negros Oriental',
  postalCode: '6200',
  fix: null,
};

/** Somewhere in Cebu City, used as the placement in most of what follows. */
const HERE = { latitude: 10.3157, longitude: 123.8854 };

/** A verified vet, the token that proves it, and the application behind both. */
async function onTheRegister(overrides: Partial<ProfessionalAttrs> = {}) {
  const { user, token } = await account('professional');
  const filed = await seed(user._id, { addresses: [CLINIC_ADDRESS, HOME_ADDRESS], ...overrides });

  const verified = await updateProfessional(filed._id, {
    status: 'verified',
    reviewedBy: new ObjectId(),
    reviewedAt: new Date(),
  });

  if (!verified) throw new Error('the fixture failed to verify its own application');

  // Approval is what publishes a filed pin, so the fixture does what the review service does.
  const application = (await publishPinnedAddresses(verified._id)) ?? verified;
  return { user, token, application };
}

// An address as it arrives from an enquiry the applicant dropped a marker on.
function pinned<T extends object>(address: T, pin: { latitude: number; longitude: number }) {
  return { ...address, mapPin: pin };
}

/** A verified vet whose clinic was filed with a marker, and is therefore on the map. */
function onTheMap() {
  return onTheRegister({ addresses: [pinned(CLINIC_ADDRESS, HERE), HOME_ADDRESS] });
}

/** One address off a response body, by kind. */
function shown(body: { addresses?: Array<Record<string, unknown>> }, kind: string) {
  return (body.addresses ?? []).find((address) => address.kind === kind);
}

describe('what a stranger reads off a published pin', () => {
  it('publishes the pin an address was filed with, and nothing for one filed without', async () => {
    const { application } = await onTheMap();

    const res = await request(app).get(`/api/v1/professionals/${application._id.toString()}`);

    expect(res.status).toBe(200);
    expect(shown(res.body, 'clinic')).toMatchObject({ mapPin: HERE });
    // Nobody dropped a marker on the house, so there is no point to read. The public
    // shape is read off the indexed point rather than off the pin, so this is absent by
    // construction and not by a filter.
    expect(shown(res.body, 'home')!.mapPin).toBeNull();
  });

  it('never publishes the reading an address was verified with', async () => {
    const { application } = await onTheMap();

    const one = await request(app).get(`/api/v1/professionals/${application._id.toString()}`);
    const list = await request(app).get('/api/v1/professionals');

    // The clinic address has a fix on the record, so its absence here is a decision the
    // transform makes rather than an accident of the fixture.
    expect(shown(one.body, 'clinic')!.fix).toBeUndefined();
    expect(shown(list.body.items[0], 'clinic')!.fix).toBeUndefined();
    expect(shown(list.body.items[0], 'clinic')).toMatchObject({ mapPin: HERE });
  });

  it('stops publishing the pin once an administrator withdraws it', async () => {
    const { application } = await onTheMap();
    await updateAddressMap(application._id, { kind: 'clinic', pin: HERE, showOnMap: false });

    const res = await request(app).get(`/api/v1/professionals/${application._id.toString()}`);

    // The vet has no way to reach this, and the placement outlives the withdrawal, so
    // putting the address back on the map is one write rather than a second enquiry.
    expect(shown(res.body, 'clinic')!.mapPin).toBeNull();
  });
});

/** A vet on the map, `northKm` north of HERE. */
async function pinnedNorthOf(northKm: number, overrides: Partial<ProfessionalAttrs> = {}) {
  return await onTheRegister({
    addresses: [
      // A degree of latitude is the same length everywhere, so offsetting north keeps
      // the expected distance a multiplication rather than a spherical calculation.
      pinned(CLINIC_ADDRESS, {
        latitude: HERE.latitude + (northKm * 1000) / 111_195,
        longitude: HERE.longitude,
      }),
    ],
    ...overrides,
  });
}

function near(params: Record<string, string | number> = {}) {
  const query = new URLSearchParams({
    lat: String(HERE.latitude),
    lng: String(HERE.longitude),
    ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
  });

  return request(app).get(`/api/v1/professionals/near?${query.toString()}`);
}

describe('GET /api/v1/professionals/near', () => {
  it('answers instead of being taken for an id', async () => {
    // Express matches in order, so this is a test about the route table: `/:id` sits
    // below it and would otherwise answer 404 for the word "near".
    const res = await near();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [], radiusKm: PROFESSIONAL_NEAR_RADIUS_KM });
  });

  it('ranks the nearest first, in metres', async () => {
    await pinnedNorthOf(9, { clinicName: 'Nine north' });
    await pinnedNorthOf(2, { clinicName: 'Two north' });

    const res = await near();

    expect(res.body.items.map((item: { clinicName: string }) => item.clinicName)).toEqual([
      'Two north',
      'Nine north',
    ]);
    expect(res.body.items[0].distanceMeters).toBeGreaterThan(1900);
    expect(res.body.items[0].distanceMeters).toBeLessThan(2100);
  });

  it('leaves out a vet whose address was filed without a marker', async () => {
    await onTheRegister({ addresses: [CLINIC_ADDRESS] });

    const res = await near();

    // Absent because the coordinates are absent from the index, not because a filter
    // here remembered to exclude them.
    expect(res.body.items).toEqual([]);
  });

  it('keeps the search inside the radius it was given', async () => {
    await pinnedNorthOf(80, { clinicName: 'Too far' });
    await pinnedNorthOf(4, { clinicName: 'Close enough' });

    const res = await near({ radiusKm: 10 });

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].clinicName).toBe('Close enough');
    expect(res.body.radiusKm).toBe(10);
  });

  it('refuses a radius past the cap rather than quietly clamping it', async () => {
    const res = await near({ radiusKm: 5000 });

    expect(res.status).toBe(400);
    expect(res.body.issues.radiusKm).toBeTruthy();
  });

  it('refuses a coordinate that is not on the planet', async () => {
    const res = await request(app).get('/api/v1/professionals/near?lat=200&lng=123.9');

    expect(res.status).toBe(400);
    expect(res.body.issues.lat).toBeTruthy();
  });

  it('publishes the pin and no licence material with each result', async () => {
    await pinnedNorthOf(1);

    const res = await near();

    expect(res.body.items[0].addresses[0].mapPin).toBeTruthy();
    expect(res.body.items[0].addresses[0].fix).toBeUndefined();
    expect(res.body.items[0].licenseNumber).toBeUndefined();
  });
});
