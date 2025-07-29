import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Wind, Sparkles, Calendar, ArrowRight } from 'lucide-react'
import { useBreathingNudgeDisplay } from '@/hooks/useBreathingNudgeDisplay'
import { formatDistanceToNow } from 'date-fns'

interface AIBreathingNudgeChatEntriesProps {
  maxEntries?: number
  showOnlyRecent?: boolean
}

export const AIBreathingNudgeChatEntries: React.FC<AIBreathingNudgeChatEntriesProps> = ({
  maxEntries = 5,
  showOnlyRecent = true
}) => {
  const navigate = useNavigate()
  const { recentNudges, acceptNudge } = useBreathingNudgeDisplay()

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
    navigate('/recovery?tab=breathing')
  }

  const getNudgeIcon = (nudgeType: string) => {
    switch (nudgeType) {
      case 'ai_coach':
        return <Wind className="h-4 w-4 text-cyan-500" />
      case 'smart_nudge':
        return <Sparkles className="h-4 w-4 text-teal-500" />
      default:
        return <Wind className="h-4 w-4 text-cyan-500" />
    }
  }

  const formatNudgeMessage = (message: string, nudgeType: string) => {
    // Add some personality based on nudge type
    const prefix = nudgeType === 'ai_coach' ? '🫁 ' : '🌊 '
    return `${prefix}${message}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <Wind className="h-4 w-4 text-cyan-500" />
        <span className="text-sm font-medium text-muted-foreground">
          Recent Breathing Suggestions
        </span>
      </div>

      {filteredNudges.map((nudge) => (
        <div
          key={nudge.id}
          className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
            nudge.user_action === 'pending'
              ? 'bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 border-cyan-200 dark:border-cyan-800'
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
                    className="text-xs h-7 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
                  >
                    Let&apos;s Breathe
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
          <Wind className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recent breathing suggestions</p>
        </div>
      )}
    </div>
  )
}