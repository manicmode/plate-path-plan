import { ExerciseCard } from './ExerciseCard';
import { RecoveryCard } from './RecoveryCard';
import { HabitsCard } from './HabitsCard';

export const ActivityLoggingSection = () => {
  return (
    <section aria-labelledby="exercise-recovery-habits-title" className="mt-12 md:mt-16">
      <header className="mb-8 md:mb-10 text-center">
        <h2 id="exercise-recovery-habits-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Log Exercise, Recovery & Habits
        </h2>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <ExerciseCard />
        <RecoveryCard />
        <HabitsCard />
      </div>
    </section>
  );
};