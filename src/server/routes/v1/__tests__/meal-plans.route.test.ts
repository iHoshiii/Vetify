import type { MealPlanInput } from '@shared/meal-plans';
import type { PetInput } from '@shared/pets';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import { insertUser } from '../../../models';
import { signAccessToken } from '../../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();
beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let sequence = 0;
async function account() {
  sequence += 1;
  const user = await insertUser({
    email: `meal${sequence}@example.com`,
    password: 'Sup3rSecret!',
    name: `Owner ${sequence}`,
    provider: 'local',
  });
  return signAccessToken({ sub: user._id.toString(), email: user.email, role: user.role });
}

const petInput: PetInput = {
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

const today = new Date().toISOString().slice(0, 10);
function planInput(petId: string): MealPlanInput {
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

describe('meal plans', () => {
  it('previews without saving, then saves and logs a feeding', async () => {
    const token = await account();
    const createdPet = await request(app)
      .post('/api/v1/pets')
      .auth(token, { type: 'bearer' })
      .send(petInput);
    const petId = createdPet.body.pet.id as string;
    const input = planInput(petId);
    const preview = await request(app)
      .post('/api/v1/meal-plans/preview')
      .auth(token, { type: 'bearer' })
      .send(input);
    expect(preview.status).toBe(200);
    expect(preview.body.preview.blockers).toEqual([]);
    const before = await request(app)
      .get(`/api/v1/meal-plans?petId=${petId}`)
      .auth(token, { type: 'bearer' });
    expect(before.body.plans).toEqual([]);

    const saved = await request(app)
      .post('/api/v1/meal-plans')
      .auth(token, { type: 'bearer' })
      .send(input);
    expect(saved.status).toBe(201);
    expect(saved.body.plan.preview.dailyGrams).toBeGreaterThan(0);
    const repeated = await request(app)
      .post('/api/v1/meal-plans')
      .auth(token, { type: 'bearer' })
      .send(input);
    expect(repeated.body.plan.id).toBe(saved.body.plan.id);
    const planId = saved.body.plan.id as string;
    const log = await request(app)
      .put(`/api/v1/meal-plans/${planId}/logs`)
      .auth(token, { type: 'bearer' })
      .send({
        date: today,
        mealIndex: 0,
        status: 'partial',
        actualGrams: 20,
        extrasKcal: 0,
        note: 'Left some',
      });
    expect(log.status).toBe(200);
    const logs = await request(app)
      .get(`/api/v1/meal-plans/${planId}/logs?date=${today}`)
      .auth(token, { type: 'bearer' });
    expect(logs.body.logs).toHaveLength(1);
    expect(logs.body.logs[0].actualGrams).toBe(20);
    const revised = await request(app)
      .post('/api/v1/meal-plans')
      .auth(token, { type: 'bearer' })
      .send({
        ...input,
        requestId: '22345678-1234-1234-1234-123456789abc',
        mode: 'manual',
        manualDailyGrams: 110,
      });
    expect(revised.status).toBe(201);
    expect(revised.body.plan.version).toBe(2);
    const history = await request(app)
      .get(`/api/v1/meal-plans?petId=${petId}`)
      .auth(token, { type: 'bearer' });
    expect(history.body.plans).toHaveLength(2);
    expect(history.body.plans[1].endedAt).not.toBeNull();
    const oldLogs = await request(app)
      .get(`/api/v1/meal-plans/${planId}/logs?date=${today}`)
      .auth(token, { type: 'bearer' });
    expect(oldLogs.body.logs[0].actualGrams).toBe(20);
  });

  it('blocks unsafe estimates but permits an existing amount and protects ownership', async () => {
    const owner = await account();
    const stranger = await account();
    const createdPet = await request(app)
      .post('/api/v1/pets')
      .auth(owner, { type: 'bearer' })
      .send({ ...petInput, healthConditions: ['diabetes'] });
    const petId = createdPet.body.pet.id as string;
    const estimate = await request(app)
      .post('/api/v1/meal-plans')
      .auth(owner, { type: 'bearer' })
      .send(planInput(petId));
    expect(estimate.status).toBe(400);
    const manual = await request(app)
      .post('/api/v1/meal-plans')
      .auth(owner, { type: 'bearer' })
      .send({
        ...planInput(petId),
        mode: 'manual',
        manualDailyGrams: 100,
        food: { ...planInput(petId).food, adequacy: 'unknown', calories: null },
      });
    expect(manual.status).toBe(201);
    expect(manual.body.plan.preview.dailyKcal).toBeNull();
    const otherList = await request(app)
      .get(`/api/v1/meal-plans?petId=${petId}`)
      .auth(stranger, { type: 'bearer' });
    expect(otherList.status).toBe(404);
    const otherLog = await request(app)
      .put(`/api/v1/meal-plans/${manual.body.plan.id}/logs`)
      .auth(stranger, { type: 'bearer' })
      .send({ date: today, mealIndex: 0, status: 'fed', actualGrams: 50, extrasKcal: 0, note: '' });
    expect(otherLog.status).toBe(404);
  });

  it('stores dated weight and nine-point condition observations for the owner only', async () => {
    const owner = await account();
    const stranger = await account();
    const createdPet = await request(app)
      .post('/api/v1/pets')
      .auth(owner, { type: 'bearer' })
      .send(petInput);
    const petId = createdPet.body.pet.id as string;
    const recorded = await request(app)
      .post('/api/v1/nutrition-observations')
      .auth(owner, { type: 'bearer' })
      .send({ petId, weightKg: 6.4, measuredOn: today, conditionScore: 5, observer: 'owner' });
    expect(recorded.status).toBe(201);
    const listed = await request(app)
      .get(`/api/v1/nutrition-observations?petId=${petId}`)
      .auth(owner, { type: 'bearer' });
    expect(listed.body.observations).toHaveLength(1);
    expect(listed.body.observations[0].conditionScore).toBe(5);
    const hidden = await request(app)
      .get(`/api/v1/nutrition-observations?petId=${petId}`)
      .auth(stranger, { type: 'bearer' });
    expect(hidden.status).toBe(404);
    const invalid = await request(app)
      .post('/api/v1/nutrition-observations')
      .auth(owner, { type: 'bearer' })
      .send({ petId, weightKg: 6.4, measuredOn: today, conditionScore: 10, observer: 'owner' });
    expect(invalid.status).toBe(400);
  });
});
