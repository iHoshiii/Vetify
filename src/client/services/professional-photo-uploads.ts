import { PROFESSIONAL_PHOTO_KINDS } from '@shared/limits';
import type { ProfessionalApplyInput } from '@shared/schemas';
import type { ProfessionalUploadRef } from '@shared/professional-uploads';
import { apiFetch } from './api';
import type { OwnProfessional } from './professionals.service';

export async function uploadProfessionalPhotos(token: string, application: ProfessionalApplyInput) {
  const photos = await Promise.all(
    PROFESSIONAL_PHOTO_KINDS.map(async (kind) => {
      const reference = await apiFetch<ProfessionalUploadRef>(
        `/professionals/invites/${encodeURIComponent(token)}/captures/${kind}`,
        { method: 'POST', body: application[kind] }
      );
      return [kind, reference] as const;
    })
  );
  return { ...application, ...Object.fromEntries(photos) };
}

export async function applyThroughInvite(input: {
  token: string;
  application: ProfessionalApplyInput;
}): Promise<OwnProfessional> {
  const application = await uploadProfessionalPhotos(input.token, input.application);
  return apiFetch<OwnProfessional>(
    `/professionals/invites/${encodeURIComponent(input.token)}/apply`,
    { method: 'POST', body: application }
  );
}
