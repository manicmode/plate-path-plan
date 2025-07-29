import { useState, useEffect } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Coach from '@/pages/Coach';
import AIFitnessCoach from '@/pages/AIFitnessCoach';
import RecoveryCoachSection from '@/components/coach/sections/RecoveryCoachSection';

const CoachMain = () => {
  const [activeTab, setActiveTab] = useState<'nutrition' | 'exercise' | 'recovery'>('nutrition');

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background">
      {/* Toggle Section */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex justify-center py-4">
          <ToggleGroup 
            type="single" 
            value={activeTab} 
            onValueChange={(value) => value && setActiveTab(value as 'nutrition' | 'exercise' | 'recovery')}
            className="bg-muted/50 rounded-lg p-1"
          >
            <ToggleGroupItem 
              value="nutrition" 
              className="rounded-md text-sm px-6 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
            >
              Nutrition
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="exercise" 
              className="rounded-md text-sm px-6 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
            >
              Exercise
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="recovery" 
              className="rounded-md text-sm px-6 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
            >
              Recovery
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        {activeTab === 'nutrition' && <Coach />}
        {activeTab === 'exercise' && <AIFitnessCoach />}
        {activeTab === 'recovery' && <RecoveryCoachSection />}
      </div>
    </div>
  );
};

export default CoachMain;