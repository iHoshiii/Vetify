import type { ObjectId } from 'mongodb';
import { professionalsCollection } from '../professionals/repository';
import { toObjectId } from '../object-id';
import { averageRatingForProfessional } from './rating-writes';

export async function refreshProfessionalRating(professional: string | ObjectId): Promise<void> {
  const collection = professionalsCollection();
  const _id = toObjectId(professional);
  for (let attempt = 0; attempt < 5; attempt++) {
    const previous = await collection.findOne<{ ratingSummaryRevision?: number }>(
      { _id },
      { projection: { ratingSummaryRevision: 1 } }
    );
    if (!previous) return;
    const revision = previous.ratingSummaryRevision ?? 0;
    const summary = await averageRatingForProfessional(_id);
    const result = await collection.updateOne(
      { _id, $expr: { $eq: [{ $ifNull: ['$ratingSummaryRevision', 0] }, revision] } },
      {
        $set: { ratingAverage: summary.average, ratingCount: summary.count, updatedAt: new Date() },
        $inc: { ratingSummaryRevision: 1 },
      }
    );
    if (result.matchedCount === 1) return;
  }
  throw new Error('Professional rating summary changed during refresh');
}
