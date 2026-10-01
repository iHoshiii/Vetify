import { petInputSchema, type PetInput } from '@shared/pets';
import { ageFromBirthMonth } from '@shared/pet-age';
import { Router } from 'express';
import { ObjectId } from 'mongodb';

import { optionalAuth } from '../../middleware/optionalAuth';
import { validate } from '../../middleware/validate';
import { getPreferences } from '../../models';
import { createPet, listPets, updatePet } from '../../models/pets';
import { isValidObjectId } from '../../models/object-id';
import { fail, ok } from '../../utils/response';
import { actorOf, signedIn } from './caller';

const router = Router();
router.use(optionalAuth, signedIn);

async function accountToday(ownerId: ObjectId): Promise<string> {
  const preferences = await getPreferences(ownerId);
  const timeZone = preferences?.region.timeZone ?? 'Asia/Manila';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

router.get('/', async (req, res) => {
  ok(res, { pets: await listPets(actorOf(req)._id) });
});

router.post('/', validate(petInputSchema), async (req, res) => {
  const ownerId = actorOf(req)._id;
  const today = await accountToday(ownerId);
  const input = req.body as PetInput;
  if (
    input.birthMonth &&
    (input.birthMonth > today.slice(0, 7) || ageFromBirthMonth(input.birthMonth, today).years > 200)
  )
    return fail(res, 400, 'Check the birth month');
  const pet = await createPet(ownerId, input, today);
  res.status(201).json({ pet });
});

router.put('/:id', validate(petInputSchema), async (req, res) => {
  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Pet not found');
  const ownerId = actorOf(req)._id;
  const today = await accountToday(ownerId);
  const input = req.body as PetInput;
  if (
    input.birthMonth &&
    (input.birthMonth > today.slice(0, 7) || ageFromBirthMonth(input.birthMonth, today).years > 200)
  )
    return fail(res, 400, 'Check the birth month');
  const pet = await updatePet(ownerId, new ObjectId(req.params.id), input, today);
  if (!pet) return fail(res, 404, 'Pet not found');
  ok(res, { pet });
});

export default router;
