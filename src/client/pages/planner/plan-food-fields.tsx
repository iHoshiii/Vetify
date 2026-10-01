import type { MealPlanInput } from '@shared/meal-plans';
import type { Pet } from '@shared/pets';

import { FoodIdentityFields } from './plan-food-identity';
import { FoodEnergyFields } from './plan-food-energy';

export function FoodFields({
  pet,
  value,
  set,
}: {
  pet: Pet;
  value: MealPlanInput;
  set: (value: MealPlanInput) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FoodIdentityFields value={value} set={set} />
      <FoodEnergyFields pet={pet} value={value} set={set} />
    </div>
  );
}
