import type { FeedingLog, FeedingLogInput, MealPlan } from '@shared/meal-plans';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { saveFeedingLog } from '@/services/meal-plans.service';

export function MealLogRow({
  plan,
  date,
  index,
  log,
}: {
  plan: MealPlan;
  date: string;
  index: number;
  log?: FeedingLog;
}) {
  const planned = plan.preview.mealGrams[index] ?? 0;
  const [grams, setGrams] = useState(String(log?.actualGrams ?? planned));
  const [extras, setExtras] = useState(String(log?.extrasKcal ?? 0));
  const [note, setNote] = useState(log?.note ?? '');
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (status: FeedingLogInput['status']) =>
      saveFeedingLog(plan.id, {
        date,
        mealIndex: index,
        status,
        actualGrams: status === 'skipped' ? 0 : Number(grams),
        extrasKcal: extras === '' ? null : Number(extras),
        note,
      }),
    onSuccess: (saved) => {
      setGrams(String(saved.actualGrams ?? ''));
      void queryClient.invalidateQueries({ queryKey: ['feeding-logs', plan.id, date] });
    },
  });
  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
            Meal {index + 1} · {plan.mealTimes[index]}
          </p>
          <p className="mt-1 text-lg font-extrabold text-slate-900">{planned} g planned</p>
        </div>
        {log && (
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold capitalize text-teal-800">
            {log.status}
          </span>
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold text-slate-600">
          Food actually fed, g
          <input
            className={`${inputClass} mt-1`}
            type="number"
            min="0.1"
            max="5000"
            step="0.1"
            value={grams}
            onChange={(event) => setGrams(event.target.value)}
          />
        </label>
        <label className="text-xs font-bold text-slate-600">
          Treats or extras, kcal
          <input
            className={`${inputClass} mt-1`}
            type="number"
            min="0"
            max="5000"
            step="0.1"
            value={extras}
            onChange={(event) => setExtras(event.target.value)}
          />
        </label>
        <label className="text-xs font-bold text-slate-600">
          Note <span className="font-normal">(optional)</span>
          <input
            className={`${inputClass} mt-1`}
            value={note}
            maxLength={300}
            placeholder="e.g. Left some food"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(['fed', 'partial', 'skipped'] as const).map((status) => (
          <button
            key={status}
            type="button"
            disabled={
              mutation.isPending || (status !== 'skipped' && (!grams || Number(grams) <= 0))
            }
            onClick={() => mutation.mutate(status)}
            className={`rounded-lg px-3 py-2 text-xs font-bold capitalize disabled:opacity-50 ${
              log?.status === status
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-teal-50'
            }`}
          >
            {status === 'fed' ? 'Mark fed' : status === 'partial' ? 'Partially fed' : 'Skipped'}
          </button>
        ))}
      </div>
      {mutation.error && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
