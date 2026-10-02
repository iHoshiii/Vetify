import {
  nutritionObservationSchema,
  type NutritionObservationInput,
} from '@shared/nutrition-observations';
import { isShihTzu, SHIH_TZU_WEIGHT_ENTRY_MAX_KG } from '@shared/pets';
import { Router } from 'express';
import { ObjectId } from 'mongodb';

import { optionalAuth } from '../../middleware/optionalAuth';
import { validate } from '../../middleware/validate';
import {
  createNutritionObservation,
  listNutritionObservations,
} from '../../models/nutrition-observations';
import { isValidObjectId } from '../../models/object-id';
import { findPet } from '../../models/pets';
import { fail, ok } from '../../utils/response';
import { accountToday } from './account-today';
import { actorOf, signedIn } from './caller';

const router = Router();
router.use(optionalAuth, signedIn);

router.get('/', async (req, res) => {
  if (!isValidObjectId(req.query.petId)) return fail(res, 400, 'Choose a pet');
  const ownerId = actorOf(req)._id;
  const petId = new ObjectId(req.query.petId);
  if (!(await findPet(ownerId, petId))) return fail(res, 404, 'Pet not found');
  return ok(res, { observations: await listNutritionObservations(ownerId, petId) });
});

router.post('/', validate(nutritionObservationSchema), async (req, res) => {
  const input = req.body as NutritionObservationInput;
  const ownerId = actorOf(req)._id;
  const pet = await findPet(ownerId, new ObjectId(input.petId));
  if (!pet) return fail(res, 404, 'Pet not found');
  const measured = Date.parse(`${input.measuredOn}T00:00:00.000Z`);
  if (
    !Number.isFinite(measured) ||
    new Date(measured).toISOString().slice(0, 10) !== input.measuredOn ||
    input.measuredOn > (await accountToday(ownerId))
  )
    return fail(res, 400, 'Check the measurement date');
  if (isShihTzu(pet.species, pet.breed) && input.weightKg > SHIH_TZU_WEIGHT_ENTRY_MAX_KG) {
    return fail(res, 400, 'Check this weight against the pet and breed');
  }
  const observation = await createNutritionObservation(ownerId, input);
  return res.status(201).json({ observation });
});

export default router;
