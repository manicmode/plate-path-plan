import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Coach from '@/pages/Coach';
import AIFitnessCoach from '@/pages/AIFitnessCoach';

const CoachMain = () => {
  const [activeTab, setActiveTab] = useState<'nutrition' | 'exercise'>('nutrition');

  return (
    <div className="min-h-screen bg-background">
      {/* Toggle Section */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex justify-center py-4">
          <ToggleGroup 
            type="single" 
            value={activeTab} 
            onValueChange={(value) => value && setActiveTab(value as 'nutrition' | 'exercise')}
            className="bg-muted/50 rounded-lg p-1"
          >
            <ToggleGroupItem 
              value="nutrition" 
              className="rounded-md text-sm px-6 py-1.5 data-[state=on]:bg-purple-600 data-[state=on]:text-white data-[state=on]:shadow-sm"
            >
              Nutrition
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="exercise" 
              className="rounded-md text-sm px-6 py-1.5 data-[state=on]:bg-purple-600 data-[state=on]:text-white data-[state=on]:shadow-sm"
            >
              Exercise
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        {activeTab === 'nutrition' && <Coach />}
        {activeTab === 'exercise' && <AIFitnessCoach />}
      </div>
    </div>
  );
};

export default CoachMain;