import type { MealPlan } from '@shared/meal-plans';
import { todayInTimeZone } from '@shared/planner-date';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ClipboardList, RefreshCcw } from 'lucide-react';
import { useState } from 'react';

import { getFeedingLogs } from '@/services/meal-plans.service';

import { MealLogRow } from './meal-log-row';
import { PlanProgress } from './plan-progress';
import { PlanWeek } from './plan-week';

export function PlanView({
  plan,
  history,
  onReview,
  onBack,
}: {
  plan: MealPlan;
  history: MealPlan[];
  onReview: () => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<'today' | 'week'>('today');
  const today = todayInTimeZone(plan.timeZone);
  const logs = useQuery({
    queryKey: ['feeding-logs', plan.id, today],
    queryFn: () => getFeedingLogs(plan.id, today),
  });
  const reportedCount = logs.data?.length ?? 0;
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-bold text-teal-800 hover:underline"
      >
        ← All pets
      </button>
      <div className="overflow-hidden rounded-[1.5rem] border border-teal-100 bg-white shadow-[0_12px_40px_rgba(23,65,55,0.08)]">
        <div className="bg-gradient-to-r from-teal-800 to-emerald-700 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-teal-100">
                Active feeding plan
              </p>
              <h2 className="mt-1 text-3xl font-extrabold">{plan.petName}</h2>
              <p className="mt-2 text-sm text-teal-50">
                {plan.food.name} · {plan.preview.dailyGrams} g each day
              </p>
            </div>
            <button
              type="button"
              onClick={onReview}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-teal-900 hover:bg-teal-50"
            >
              <RefreshCcw size={16} /> Review plan
            </button>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
          <div className="rounded-xl bg-teal-50 p-4">
            <p className="text-xs font-bold uppercase text-teal-700">Daily food</p>
            <p className="mt-1 text-xl font-extrabold text-teal-950">{plan.preview.dailyGrams} g</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-600">Meals</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">
              {plan.mealTimes.length} per day
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-600">Today</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">
              {reportedCount} meals logged
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            aria-pressed={tab === 'today'}
            onClick={() => setTab('today')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${
              tab === 'today' ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <ClipboardList size={16} /> Today
          </button>
          <button
            type="button"
            aria-pressed={tab === 'week'}
            onClick={() => setTab('week')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${
              tab === 'week' ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <CalendarDays size={16} /> Week
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Plan version {plan.version}
          {history.length > 1 ? ` · ${history.length - 1} previous` : ''}
        </p>
      </div>
      {tab === 'today' ? (
        <div className="space-y-3">
          {logs.isLoading && <p className="text-sm text-slate-600">Loading feeding logs...</p>}
          {logs.isError && (
            <p role="alert" className="text-sm text-rose-700">
              Logs could not be loaded.
            </p>
          )}
          {plan.mealTimes.map((_, index) => (
            <MealLogRow
              key={`${plan.id}-${index}`}
              plan={plan}
              date={today}
              index={index}
              log={logs.data?.find((item) => item.mealIndex === index)}
            />
          ))}
        </div>
      ) : (
        <PlanWeek plan={plan} today={today} />
      )}
      <PlanProgress plan={plan} onReview={onReview} />
      {history.length > 1 && (
        <details className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">Previous plans</summary>
          <ul className="mt-3 space-y-2">
            {history.slice(1).map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-2 text-slate-600"
              >
                <span>
                  Version {item.version} · {item.food.name}
                </span>
                <span>
                  {item.preview.dailyGrams} g/day · {item.createdAt.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="text-xs text-slate-500">
        {plan.mode === 'estimate'
          ? 'This is an initial estimate. Review weight and condition with your veterinarian.'
          : 'This schedule uses an amount you entered. Vetify has not calculated it.'}
      </p>
    </div>
  );
}
