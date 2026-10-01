import type { MealPlan } from '@shared/meal-plans';
import { todayInTimeZone } from '@shared/planner-date';
import { useQueries, useQuery } from '@tanstack/react-query';

import { getFeedingLogs } from '@/services/meal-plans.service';

export function useDayLogs(plan: MealPlan, history: MealPlan[], today: string) {
  const logs = useQuery({
    queryKey: ['feeding-logs', plan.id, today],
    queryFn: () => getFeedingLogs(plan.id, today),
  });
  const earlierPlans = history.filter(
    (item) =>
      item.id !== plan.id &&
      item.endedAt &&
      todayInTimeZone(item.timeZone, new Date(item.endedAt)) === today
  );
  const earlierQueries = useQueries({
    queries: earlierPlans.map((item) => ({
      queryKey: ['feeding-logs', item.id, today],
      queryFn: () => getFeedingLogs(item.id, today),
    })),
  });
  return {
    logs: logs.data ?? [],
    earlier: earlierPlans.map((item, index) => ({
      plan: item,
      logs: earlierQueries[index]?.data ?? [],
    })),
    isLoading: logs.isLoading || earlierQueries.some((query) => query.isLoading),
    isError: logs.isError || earlierQueries.some((query) => query.isError),
  };
}
