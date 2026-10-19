import type { Filter } from 'mongodb';
import { errors, type Adapter, type AdapterPayload } from 'oidc-provider';
import { getDb } from '../config/db';
import { OIDC_COLLECTION } from '../models/oidc';
type Artifact = { _id: string; model: string; payload: AdapterPayload; expiresAt: Date };
export const oidcArtifacts = () => getDb().collection<Artifact>(OIDC_COLLECTION);

export class MongoOidcAdapter implements Adapter {
  constructor(private readonly model: string) {}

  async upsert(id: string, payload: AdapterPayload, expiresIn?: number) {
    if (!expiresIn || expiresIn <= 0) throw new Error('OIDC artifacts require a finite expiry.');
    await oidcArtifacts().updateOne(
      { _id: `${this.model}:${id}` },
      { $set: { model: this.model, payload, expiresAt: new Date(Date.now() + expiresIn * 1000) } },
      { upsert: true }
    );
  }

  private async lookup(filter: Filter<Artifact>) {
    const result = await oidcArtifacts().findOne({
      ...filter,
      model: this.model,
      expiresAt: { $gt: new Date() },
    });
    return result?.payload;
  }

  find(id: string) {
    return this.lookup({ _id: `${this.model}:${id}` });
  }
  findByUid(uid: string) {
    return this.lookup({ 'payload.uid': uid });
  }
  findByUserCode(userCode: string) {
    return this.lookup({ 'payload.userCode': userCode });
  }

  async consume(id: string) {
    const result = await oidcArtifacts().updateOne(
      {
        _id: `${this.model}:${id}`,
        expiresAt: { $gt: new Date() },
        'payload.consumed': { $exists: false },
      },
      { $set: { 'payload.consumed': Math.floor(Date.now() / 1000) } }
    );
    if (result.modifiedCount !== 1)
      throw new errors.InvalidGrant('Authorization code already consumed or expired.');
  }

  async destroy(id: string) {
    await oidcArtifacts().deleteOne({ _id: `${this.model}:${id}` });
  }
  async revokeByGrantId(grantId: string) {
    await oidcArtifacts().deleteMany({ 'payload.grantId': grantId });
  }
}
