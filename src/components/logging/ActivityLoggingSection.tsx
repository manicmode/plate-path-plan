import { ExerciseCard } from './ExerciseCard';
import { RecoveryCard } from './RecoveryCard';
import { HabitsCard } from './HabitsCard';

export const ActivityLoggingSection = () => {
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <ExerciseCard />
        <RecoveryCard />
        <HabitsCard />
      </div>
    </section>
  );
};