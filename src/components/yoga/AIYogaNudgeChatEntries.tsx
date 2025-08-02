import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Heart, Sparkles, Calendar, ArrowRight } from 'lucide-react'
import { useYogaNudgeDisplay } from '@/hooks/useYogaNudgeDisplay'
import { formatDistanceToNow } from 'date-fns'

interface AIYogaNudgeChatEntriesProps {
  maxEntries?: number
  showOnlyRecent?: boolean
}

export const AIYogaNudgeChatEntries: React.FC<AIYogaNudgeChatEntriesProps> = ({
  maxEntries = 5,
  showOnlyRecent = true
}) => {
  const navigate = useNavigate()
  const { recentNudges, acceptNudge } = useYogaNudgeDisplay()

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
    navigate('/recovery/yoga')
  }

  const getNudgeIcon = (nudgeType: string) => {
    switch (nudgeType) {
      case 'ai_coach':
        return <Heart className="h-4 w-4 text-purple-500" />
      case 'smart_nudge':
        return <Sparkles className="h-4 w-4 text-violet-500" />
      default:
        return <Heart className="h-4 w-4 text-purple-500" />
    }
  }

  // 🎭 Coach Personality Nudge - Recovery Coach: Gentle, soothing, poetic
  const formatNudgeMessage = (message: string, nudgeType: string) => {
    const prefix = nudgeType === 'ai_coach' ? '🌙 ' : '✨ '
    return `${prefix}${message}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium text-muted-foreground">
          Flowing Recovery Whispers
        </span>
      </div>

      {filteredNudges.map((nudge) => (
        <div
          key={nudge.id}
          className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
            nudge.user_action === 'pending'
              ? 'bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800'
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
                    className="text-xs h-7 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
                  >
                    Let&apos;s Flow
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
              
              {nudge.user_action === 'accepted' && (
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <Calendar className="h-3 w-3" />
                  <span>Completed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}