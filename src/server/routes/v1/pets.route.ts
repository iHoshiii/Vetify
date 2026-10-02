import { petInputSchema, type PetInput } from '@shared/pets';
import { ageFromBirthMonth } from '@shared/pet-age';
import { Router } from 'express';
import { ObjectId } from 'mongodb';

import { optionalAuth } from '../../middleware/optionalAuth';
import { validate } from '../../middleware/validate';
import { createPet, listPets, updatePet } from '../../models/pets';
import { isValidObjectId } from '../../models/object-id';
import { fail, ok } from '../../utils/response';
import { actorOf, signedIn } from './caller';
import { accountToday } from './account-today';

const router = Router();
router.use(optionalAuth, signedIn);

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
