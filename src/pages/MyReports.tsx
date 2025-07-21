import { PageHeader } from "@/components/page-header";
import { useMyReports } from "@/lib/queries/use-my-reports";
import { ModernActionCard } from "@/components/cards/modern-action-card";
import { ModernTrackerCard } from "@/components/cards/modern-tracker-card";
import { ModernNutrientCard } from "@/components/cards/modern-nutrient-card";
import { useTrackers } from "@/lib/queries/use-trackers";
import { useMyNutrients } from "@/lib/queries/use-my-nutrients";
import { Loader } from "@/components/ui/loader";
import { EmptyState } from "@/components/ui/empty-state";

export default function MyReportsPage() {
  const { data: myReports, isLoading: reportsLoading } = useMyReports();
  const { data: trackers, isLoading: trackersLoading } = useTrackers();
  const { data: nutrients, isLoading: nutrientsLoading } = useMyNutrients();

  const isLoading = reportsLoading || trackersLoading || nutrientsLoading;

  return (
    <div className="p-4 space-y-6">
      <PageHeader title="My Reports" description="Your personal insights and stats." />

      {isLoading ? (
        <Loader />
      ) : (
        <>
          {/* Trackers */}
          {trackers?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trackers.map((tracker) => (
                <ModernTrackerCard key={tracker.id} tracker={tracker} />
              ))}
            </div>
          ) : (
            <EmptyState title="No Trackers" description="You haven't set up any trackers yet." />
          )}

          {/* Nutrients */}
          {nutrients?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nutrients.map((nutrient) => (
                <ModernNutrientCard key={nutrient.id} nutrient={nutrient} />
              ))}
            </div>
          ) : (
            <EmptyState title="No Nutrient Data" description="No nutrient records found." />
          )}

          {/* Reports */}
          {myReports?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myReports.map((report) => (
                <ModernActionCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <EmptyState title="No Reports" description="You haven't generated any reports yet." />
          )}
        </>
      )}
    </div>
  );
}
