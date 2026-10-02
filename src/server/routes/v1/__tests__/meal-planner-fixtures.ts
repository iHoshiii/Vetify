import type { MealPlanInput } from '@shared/meal-plans';
import type { PetInput } from '@shared/pets';

import { insertUser } from '../../../models';
import { signAccessToken } from '../../../services/auth.service';

let sequence = 0;
export async function account() {
  sequence += 1;
  const user = await insertUser({
    email: `meal${sequence}@example.com`,
    password: 'Sup3rSecret!',
    name: `Owner ${sequence}`,
    provider: 'local',
  });
  return signAccessToken({ sub: user._id.toString(), email: user.email, role: user.role });
}

export const petInput: PetInput = {
  name: 'Milo',
  species: 'dog',
  otherSpecies: '',
  breed: 'Shih Tzu',
  birthMonth: '2020-01',
  ageYears: 6,
  ageMonths: 0,
  sex: 'male',
  neuterStatus: 'yes',
  weightKg: 6.2,
  allergies: [],
  healthConditions: [],
  foodPreferences: '',
  currentFood: '',
  activityLevel: 'moderate',
  bodyConditionScore: null,
  feedingGoal: 'maintain',
  pregnantOrNursing: 'no',
};

export const today = new Date().toISOString().slice(0, 10);

export function planInput(petId: string): MealPlanInput {
  return {
    requestId: '12345678-1234-1234-1234-123456789abc',
    petId,
    mode: 'estimate',
    weightKg: 6.2,
    weightMeasuredOn: today,
    conditionScore: 5,
    stableWeight: true,
    growing: false,
    healthConcern: false,
    prescribedDiet: false,
    appetiteChange: false,
    food: {
      name: 'Adult food',
      form: 'dry',
      adequacy: 'complete',
      species: 'dog',
      lifeStage: 'adult',
      calorieBasis: 'kg',
      calories: 3500,
      packageGrams: null,
      labelSource: 'Bag label',
      labelCheckedOn: today,
    },
    extrasKcal: 0,
    manualDailyGrams: null,
    mealTimes: ['08:00', '18:00'],
  };
}
