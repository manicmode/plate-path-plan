import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, Calendar, Sparkles } from 'lucide-react'
import { useMeditationNudgeDisplay } from '@/hooks/useMeditationNudgeDisplay'
import { useIsMobile } from '@/hooks/use-mobile'
import { useNudgeTracking } from '@/hooks/useNudgeTracking'
import { NudgeCard } from '@/components/nudges/NudgeCard'

interface MeditationNudgeBannerProps {
  onAccept?: () => void
  onDismiss?: () => void
}

export const MeditationNudgeBanner: React.FC<MeditationNudgeBannerProps> = ({
  onAccept,
  onDismiss
}) => {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { activeNudge, acceptNudge, dismissNudge } = useMeditationNudgeDisplay()
  const { trackNudgeAction } = useNudgeTracking()

  if (!activeNudge) return null

  const handleAccept = async () => {
    await acceptNudge(activeNudge.id)
    await trackNudgeAction(activeNudge.nudge_type, 'accept')
    onAccept?.()
    navigate('/guided-meditation')
  }

  const handleDismiss = async () => {
    await dismissNudge(activeNudge.id)
    onDismiss?.()
  }

  const getNudgeIcon = () => {
    switch (activeNudge.nudge_type) {
      case 'ai_coach':
        return <Brain className="h-5 w-5" />
      case 'smart_nudge':
        return <Sparkles className="h-5 w-5" />
      case 'daily_reminder':
        return <Calendar className="h-5 w-5" />
      default:
        return <Brain className="h-5 w-5" />
    }
  }

  const getTitle = () => {
    switch (activeNudge.nudge_type) {
      case 'ai_coach':
        return 'AI Coach Suggestion'
      case 'smart_nudge':
        return 'Mindfulness Nudge'
      case 'daily_reminder':
        return 'Daily Reminder'
      default:
        return 'Meditation Nudge'
    }
  }

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 animate-slide-down ${isMobile ? 'max-w-full' : 'max-w-lg mx-auto'}`}>
      <NudgeCard
        title={getTitle()}
        icon={getNudgeIcon()}
        tone="calm"
        cta={{
          label: "🌙 Embrace Stillness",
          onClick: handleAccept
        }}
        onDismiss={handleDismiss}
      >
        <p>{activeNudge.nudge_message}</p>
        
        {/* Secondary action */}
        <div className="mt-3">
          <button
            onClick={handleDismiss}
            className="rounded-xl px-3 py-1.5 bg-slate-900/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-900/10 dark:hover:bg-white/10 transition-colors"
          >
            Peacefully defer
          </button>
        </div>
      </NudgeCard>
    </div>
  )
}