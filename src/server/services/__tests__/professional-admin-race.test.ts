import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as models from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { reviewProfessional } from '../professionals.service';

beforeAll(startTestDb, 120_000);
afterEach(async () => {
  vi.restoreAllMocks();
  await clearTestDb();
});
afterAll(stopTestDb);

describe('admin promotion during professional review', () => {
  it.each(['verified', 'rejected', 'suspended'] as const)(
    'preserves a concurrent admin promotion during a %s decision',
    async (decision) => {
      const applicant = await models.insertUser({
        email: 'applicant@admin.test',
        provider: 'google',
        role: decision === 'verified' ? 'user' : 'professional',
      });
      const reviewer = await models.insertUser({
        email: 'reviewer@admin.test',
        provider: 'google',
        role: 'admin',
      });
      const filed = await models.insertProfessional({
        user: applicant._id,
        fullName: '$Promoted Vet',
        licenseNumber: 'VET-01',
        licenseAuthority: 'Professional Regulation Commission',
        credentialUrls: ['https://example.com/licence.pdf'],
        clinicName: 'Vet Clinic',
        addresses: [
          {
            kind: 'clinic',
            line1: '12 Mabini Street',
            city: 'Cebu City',
            province: 'Cebu',
            postalCode: '6000',
            fix: null,
          },
        ],
        bio: 'Small animal practice.',
        yearsExperience: 5,
        backgroundCheckConsent: true,
      });
      const original = models.updateProfessional;
      vi.spyOn(models, 'updateProfessional').mockImplementationOnce(async (id, patch) => {
        await models
          .usersCollection()
          .updateOne({ _id: applicant._id }, { $set: { role: 'admin' } });
        await models.usersCollection().updateOne({ _id: reviewer._id }, { $set: { role: 'user' } });
        return original(id, patch);
      });
      const result = await reviewProfessional({
        id: filed._id,
        decision,
        reviewer,
        reason: 'Review result',
      });
      expect(result?.roleTo).toBe('admin');
      expect(await models.findUserById(applicant._id)).toMatchObject({
        role: 'admin',
        status: 'active',
      });
      expect(await models.countActiveAdmins()).toBe(1);
      if (decision === 'verified') {
        expect((await models.findUserById(applicant._id))?.name).toBe('$Promoted Vet');
      }
      expect((await models.auditLogsCollection().findOne({}))?.metadata.roleTo).toBe('admin');
    }
  );
});
