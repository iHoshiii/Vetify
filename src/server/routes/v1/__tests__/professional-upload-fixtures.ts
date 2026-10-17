import { randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import request from 'supertest';
import { createApp } from '../../../app';
import { insertUser } from '../../../models/users';
import {
  insertProfessionalInquiry,
  updateProfessionalInquiry,
} from '../../../models/professional-inquiries';
import { signAccessToken } from '../../../services/auth.service';
import { hashToken } from '../../../models/refresh-token/utils';
import { PROFESSIONAL_PHOTO_KINDS } from '@shared/limits';
import type { ProfessionalUploadRef } from '@shared/professional-uploads';

export const app = createApp();
let sequence = 0;
export const photo = (size = 32) => ({
  data: Buffer.alloc(size, 7).toString('base64'),
  mimeType: 'image/jpeg',
  capturedAt: new Date().toISOString(),
});
export async function fixture() {
  sequence += 1;
  const user = await insertUser({
    email: `photo-owner-${sequence}@example.test`,
    provider: 'google',
    emailVerified: true,
  });
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: 'user',
  });
  const token = randomBytes(32).toString('hex');
  const inquiry = await insertProfessionalInquiry({
    name: `Photo Owner ${sequence}`,
    email: user.email,
    licenseNumber: `VET-${sequence}-1234`,
    currentLocation: 'Cebu City, Cebu',
    motivation: 'I would like to provide veterinary care to families.',
  });
  await updateProfessionalInquiry(inquiry._id, {
    status: 'invited',
    inviteTokenHash: hashToken(token),
    inviteExpiresAt: new Date(Date.now() + 60 * 60_000),
    invitedAt: new Date(),
    inviteCount: 1,
    reviewedBy: new ObjectId(),
    reviewedAt: new Date(),
  });
  return {
    user,
    inquiry,
    token,
    authorization: `Bearer ${accessToken}`,
    base: `/api/v1/professionals/invites/${token}`,
    application: {
      fullName: inquiry.name,
      licenseNumber: inquiry.licenseNumber,
      licenseAuthority: 'Professional Regulation Commission',
      addresses: [{ kind: 'home', line1: '12 Mabini Street', city: 'Cebu City', province: 'Cebu' }],
      yearsExperience: 5,
      backgroundCheckConsent: true,
    },
  };
}
export async function uploadAll(owner: Awaited<ReturnType<typeof fixture>>, size = 32) {
  const refs = {} as Record<(typeof PROFESSIONAL_PHOTO_KINDS)[number], ProfessionalUploadRef>;
  for (const kind of PROFESSIONAL_PHOTO_KINDS) {
    const response = await request(app)
      .post(`${owner.base}/captures/${kind}`)
      .set('Authorization', owner.authorization)
      .send(photo(size))
      .expect(201);
    refs[kind] = response.body;
  }
  return refs;
}
