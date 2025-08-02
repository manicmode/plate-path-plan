import { Thermometer, Snowflake, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useThermotherapyNudgeDisplay } from '@/hooks/useThermotherapyNudgeDisplay';

interface AIThermotherapyNudgeChatEntriesProps {
  maxEntries?: number;
  showOnlyRecent?: boolean;
}

export function AIThermotherapyNudgeChatEntries({ 
  maxEntries = 3, 
  showOnlyRecent = false 
}: AIThermotherapyNudgeChatEntriesProps) {
  const navigate = useNavigate();
  const { 
    recentNudges, 
    acceptNudge, 
    dismissNudge 
  } = useThermotherapyNudgeDisplay();

  // Filter nudges based on type and recency
  const filteredNudges = recentNudges
    .filter(nudge => {
      if (showOnlyRecent && nudge.user_action !== 'pending') return false;
      return nudge.nudge_type === 'ai_coach' || nudge.nudge_type === 'smart_nudge';
    })
    .slice(0, maxEntries);

  const handleNudgeAccept = async (nudgeId: string) => {
    await acceptNudge(nudgeId);
    navigate('/recovery?tab=thermotherapy');
  };

  const getNudgeIcon = (nudgeType: string) => {
    switch (nudgeType) {
      case 'ai_coach':
        return <div className="flex items-center"><Snowflake className="h-4 w-4 text-blue-400" /><Thermometer className="h-4 w-4 text-red-400 ml-1" /></div>;
      case 'smart_nudge':
        return <div className="flex items-center"><Thermometer className="h-4 w-4 text-orange-400" /><Snowflake className="h-4 w-4 text-blue-400 ml-1" /></div>;
      default:
        return <Thermometer className="h-4 w-4 text-orange-400" />;
    }
  };

  if (filteredNudges.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {filteredNudges.map((nudge) => (
        <div key={nudge.id} className="bg-gradient-to-r from-blue-900/20 to-red-900/20 border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {getNudgeIcon(nudge.nudge_type)}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-orange-300">
                  {/* 🎭 Coach Personality Nudge - Recovery Coach: Gentle, soothing, poetic */}
                  {nudge.nudge_type === 'ai_coach' ? '🔥❄️ Thermal Harmony Guide' : '⚡ Sacred Temperature Therapy'}
                </span>
                <span className="text-xs text-white/50">
                  {new Date(nudge.delivered_at).toLocaleTimeString([], { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              
              <p className="text-white/90 text-sm leading-relaxed">
                {/* 🎭 Coach Personality Nudge - Recovery Coach: Gentle, soothing, poetic */}
                {nudge.nudge_type === 'ai_coach' ? '🌙 ' : '💫 '}
                {nudge.nudge_message}
              </p>
              
              {nudge.user_action === 'pending' ? (
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleNudgeAccept(nudge.id)}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white"
                  >
                    Begin Thermal Journey
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => dismissNudge(nudge.id)}
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white/70 hover:bg-white/10"
                  >
                    Hold this moment
                  </Button>
                </div>
              ) : (
                <div className="pt-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">
                    {nudge.user_action === 'accepted' ? '✅ Accepted' : '❌ Dismissed'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {filteredNudges.length === 0 && (
        <div className="text-center py-6 text-white/60">
          <div className="flex items-center justify-center mb-2">
            <Snowflake className="h-5 w-5 text-blue-400" />
            <Thermometer className="h-5 w-5 text-red-400 ml-1" />
          </div>
          <p className="text-sm">No recent thermal therapy suggestions</p>
        </div>
      )}
    </div>
  );
}