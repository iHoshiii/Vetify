import {
  listAudit,
  type AdminPage,
  type AuditEntry,
  type AuditListParams,
} from '@/services/admin.service';
import { useQuery } from '@tanstack/react-query';

import { ADMIN_STALE_TIME, adminKeys, retryUnlessRefused } from './admin-keys';

/**
 * One page of the audit trail.
 *
 * Read-only, because the trail is: there is no mutation hook in this file and no
 * endpoint behind one. Paging keeps the current page on screen while the next
 * loads, the same way every other list here does.
 */
export function useAudit(params: AuditListParams = {}) {
  return useQuery<AdminPage<AuditEntry>>({
    queryKey: adminKeys.auditList(params),
    queryFn: ({ signal }) => listAudit(params, signal),
    staleTime: ADMIN_STALE_TIME,
    placeholderData: (previous) => previous,
    retry: retryUnlessRefused,
  });
}
