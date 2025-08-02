import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Brain, Sparkles, Calendar, ArrowRight } from 'lucide-react'
import { useMeditationNudgeDisplay } from '@/hooks/useMeditationNudgeDisplay'
import { formatDistanceToNow } from 'date-fns'

interface AINudgeChatEntriesProps {
  maxEntries?: number
  showOnlyRecent?: boolean
}

export const AINudgeChatEntries: React.FC<AINudgeChatEntriesProps> = ({
  maxEntries = 5,
  showOnlyRecent = true
}) => {
  const navigate = useNavigate()
  const { recentNudges, acceptNudge } = useMeditationNudgeDisplay()

  // Filter nudges for AI coach feed
  const filteredNudges = recentNudges
    .filter(nudge => {
      if (showOnlyRecent) {
        const nudgeAge = Date.now() - new Date(nudge.created_at).getTime()
        return nudgeAge < 3 * 24 * 60 * 60 * 1000 // Last 3 days
      }
      return true
    })
    .filter(nudge => nudge.nudge_type === 'ai_coach' || nudge.nudge_type === 'smart_nudge')
    .slice(0, maxEntries)

  if (filteredNudges.length === 0) return null

  const handleNudgeAccept = async (nudgeId: string) => {
    await acceptNudge(nudgeId)
    navigate('/guided-meditation')
  }

  const getNudgeIcon = (nudgeType: string) => {
    switch (nudgeType) {
      case 'ai_coach':
        return <Brain className="h-4 w-4 text-blue-500" />
      case 'smart_nudge':
        return <Sparkles className="h-4 w-4 text-purple-500" />
      default:
        return <Brain className="h-4 w-4 text-blue-500" />
    }
  }

  // 🎭 Coach Personality Nudge - Recovery Coach: Gentle, soothing, poetic
  const formatNudgeMessage = (message: string, nudgeType: string) => {
    // Recovery Coach uses gentle, poetic, emotionally supportive tone
    const recoveryPrefixes = [
      "Gentle invitation... ",
      "Your soul whispers... ", 
      "In stillness, wisdom flows... ",
      "Like a soft breeze... ",
      "With loving awareness... "
    ];
    
    const randomPrefix = recoveryPrefixes[Math.floor(Math.random() * recoveryPrefixes.length)];
    return `${randomPrefix}${message} 🌙💫`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium text-muted-foreground">
          Gentle Nutrition Wisdom
        </span>
      </div>

      {filteredNudges.map((nudge) => (
        <div
          key={nudge.id}
          className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
            nudge.user_action === 'pending'
              ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800'
              : 'bg-muted/50 border-border/50 opacity-75'
          }`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {getNudgeIcon(nudge.nudge_type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {nudge.nudge_type === 'ai_coach' ? 'AI Coach' : 'Smart Nudge'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(nudge.created_at), { addSuffix: true })}
                </span>
              </div>
              
              <p className="text-sm text-foreground mb-3 leading-relaxed">
                {formatNudgeMessage(nudge.nudge_message, nudge.nudge_type)}
              </p>
              
              {nudge.user_action === 'pending' && (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleNudgeAccept(nudge.id)}
                    size="sm"
                    className="text-xs h-7 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    Let&apos;s Go
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
              
              {nudge.user_action === 'accepted' && (
                <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
                  <span>✓</span>
                  <span>Accepted</span>
                </div>
              )}
              
              {nudge.user_action === 'dismissed' && (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <span>↷</span>
                  <span>Dismissed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {filteredNudges.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recent meditation suggestions</p>
        </div>
      )}
    </div>
  )
}

// Helper function to check if component has content
export const useAINudgeChatEntriesHasContent = (props: AINudgeChatEntriesProps) => {
  const { recentNudges } = useMeditationNudgeDisplay()
  const { maxEntries = 5, showOnlyRecent = true } = props

  const filteredNudges = recentNudges
    .filter(nudge => {
      if (showOnlyRecent) {
        const nudgeAge = Date.now() - new Date(nudge.created_at).getTime()
        return nudgeAge < 3 * 24 * 60 * 60 * 1000 // Last 3 days
      }
      return true
    })
    .filter(nudge => nudge.nudge_type === 'ai_coach' || nudge.nudge_type === 'smart_nudge')
    .slice(0, maxEntries)

  return filteredNudges.length > 0
}