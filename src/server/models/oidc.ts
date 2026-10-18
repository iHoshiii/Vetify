import type { IndexDescription } from 'mongodb';

export const OIDC_COLLECTION = 'oidcArtifacts';
export const OIDC_INDEXES: IndexDescription[] = [
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  { key: { model: 1, 'payload.uid': 1 }, sparse: true },
  { key: { model: 1, 'payload.userCode': 1 }, sparse: true },
  { key: { 'payload.grantId': 1 } },
];
export const OIDC_BINDINGS_COLLECTION = 'oidcGrantBindings';
export const OIDC_BINDING_INDEXES: IndexDescription[] = [
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
];
