import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROFESSIONAL_PHOTO_KINDS } from '@shared/limits';
import type { ProfessionalApplyInput } from '@shared/schemas';
import { apiFetch } from '../services/api';
import { applyThroughInvite } from '../services/professional-photo-uploads';

vi.mock('../services/api', () => ({ apiFetch: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
const capture = {
  data: 'aGk=',
  mimeType: 'image/jpeg' as const,
  capturedAt: new Date().toISOString(),
};
const application: ProfessionalApplyInput = {
  fullName: 'Photo Owner',
  licenseNumber: 'VET-1234',
  licenseAuthority: 'Professional Regulation Commission',
  addresses: [{ kind: 'home', line1: '12 Mabini Street', city: 'Cebu City', province: 'Cebu' }],
  yearsExperience: 5,
  backgroundCheckConsent: true,
  portrait: capture,
  licenseFront: capture,
  licenseBack: capture,
};

describe('professional photo transport', () => {
  it('uploads each photo separately and submits only references with the application', async () => {
    const refs = PROFESSIONAL_PHOTO_KINDS.map((_, index) => ({
      uploadId: String(index + 1).repeat(24),
      revision: String(index + 1).repeat(64),
    }));
    for (const ref of refs) vi.mocked(apiFetch).mockResolvedValueOnce(ref);
    vi.mocked(apiFetch).mockResolvedValueOnce({ id: 'submitted' });
    const result = await applyThroughInvite({ token: 'a'.repeat(64), application });
    expect(result).toEqual({ id: 'submitted' });
    expect(apiFetch).toHaveBeenCalledTimes(4);
    PROFESSIONAL_PHOTO_KINDS.forEach((kind, index) => {
      expect(apiFetch).toHaveBeenNthCalledWith(
        index + 1,
        `/professionals/invites/${'a'.repeat(64)}/captures/${kind}`,
        { method: 'POST', body: capture }
      );
    });
    const submitted = vi.mocked(apiFetch).mock.calls[3][1]?.body;
    expect(submitted).toEqual({
      ...application,
      portrait: refs[0],
      licenseFront: refs[1],
      licenseBack: refs[2],
    });
    expect(JSON.stringify(submitted)).not.toContain(capture.data);
  });

  it('does not file an application when any photo upload fails', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Photo upload failed'));
    vi.mocked(apiFetch).mockResolvedValue({ uploadId: '1'.repeat(24), revision: 'a'.repeat(64) });
    await expect(applyThroughInvite({ token: 'a'.repeat(64), application })).rejects.toThrow(
      'Photo upload failed'
    );
    expect(vi.mocked(apiFetch).mock.calls.some(([path]) => path.endsWith('/apply'))).toBe(false);
  });
});
