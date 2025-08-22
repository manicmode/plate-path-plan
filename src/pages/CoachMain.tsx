import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useFeatureFlagOptimized } from '@/hooks/useFeatureFlagOptimized';
import { useAdminRole } from '@/hooks/useAdminRole';
import Coach from '@/pages/Coach';
import AIFitnessCoach from '@/pages/AIFitnessCoach';
import RecoveryCoachSection from '@/components/coach/sections/RecoveryCoachSection';


const CoachMain = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'nutrition' | 'exercise' | 'recovery'>('nutrition');
  
  // Voice coach feature flags
  const { enabled: killSwitchDisabled } = useFeatureFlagOptimized("voice_coach_disabled");
  const { enabled: mvpEnabled } = useFeatureFlagOptimized("voice_coach_mvp");
  const { isAdmin } = useAdminRole();
  
  // Voice coach is allowed if kill switch is off AND (user is admin OR MVP is enabled)
  const voiceCoachAllowed = !killSwitchDisabled && (isAdmin || mvpEnabled);

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Voice Coach Pill */}
      <header className="flex items-center justify-between px-4 pt-3 pb-2">
        <h1 className="text-2xl font-semibold tracking-tight">Coach</h1>
        
        {voiceCoachAllowed && (
          <button
            onClick={() => navigate('/voice-agent')}
            aria-label="Speak to Coach"
            className="
              inline-flex items-center gap-2 rounded-full
              bg-gradient-to-r from-teal-400 to-emerald-400
              text-slate-900 font-semibold px-3.5 py-1.5
              shadow-[0_10px_28px_rgba(16,185,129,0.40)]
              hover:shadow-[0_12px_32px_rgba(16,185,129,0.50)]
              transition active:scale-[0.98] select-none
            "
          >
            <span className="text-lg leading-none">🎙️</span>
            <span className="leading-none">Speak to Coach</span>
          </button>
        )}
      </header>

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
              className={`rounded-md text-sm px-6 py-1.5 transition-all duration-300 ${
                activeTab === 'nutrition' 
                  ? 'bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400 dark:from-purple-600 dark:via-blue-600 dark:to-emerald-600 text-white shadow-lg' 
                  : 'hover:bg-muted/60'
              }`}
            >
              Nutrition
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="exercise" 
              className={`rounded-md text-sm px-6 py-1.5 transition-all duration-300 ${
                activeTab === 'exercise' 
                  ? 'bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500 dark:from-indigo-500 dark:via-purple-600 dark:to-indigo-600 text-white shadow-lg' 
                  : 'hover:bg-muted/60'
              }`}
            >
              Exercise
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="recovery" 
              className={`rounded-md text-sm px-6 py-1.5 transition-all duration-300 ${
                activeTab === 'recovery' 
                  ? 'bg-gradient-to-r from-orange-400 via-pink-400 to-rose-400 dark:from-orange-500 dark:via-pink-500 dark:to-rose-500 text-white shadow-lg' 
                  : 'hover:bg-muted/60'
              }`}
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