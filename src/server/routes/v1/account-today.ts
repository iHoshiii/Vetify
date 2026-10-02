import { todayInTimeZone } from '@shared/planner-date';
import { ObjectId } from 'mongodb';

import { getPreferences } from '../../models';

export async function accountTimeZone(ownerId: ObjectId): Promise<string> {
  const preferences = await getPreferences(ownerId);
  return preferences?.region.timeZone ?? 'Asia/Manila';
}

export async function accountToday(ownerId: ObjectId): Promise<string> {
  const timeZone = await accountTimeZone(ownerId);
  return todayInTimeZone(timeZone);
}
