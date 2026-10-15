import Footer from '@/components/home/footer';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import PlannerAccounts from './planner-accounts';
import PlannerDownload from './planner-download';
import PlannerHighlights from './planner-highlights';

export default function PlannerPage() {
  useDocumentTitle(
    'Meal Planner app',
    'Meet the Vetify Meal Planner app, explore its highlights and learn how your Vetify account connects.'
  );
  return (
    <main className="bg-white text-slate-950">
      <PlannerDownload />
      <PlannerHighlights />
      <PlannerAccounts />
      <Footer />
    </main>
  );
}
