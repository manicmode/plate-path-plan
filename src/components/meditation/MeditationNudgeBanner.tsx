import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { X, Brain, Calendar, Sparkles } from 'lucide-react'
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
  // 🎮 Coach Gamification System
  const { trackNudgeAction } = useNudgeTracking()

  if (!activeNudge) return null

  const handleAccept = async () => {
    await acceptNudge(activeNudge.id)
    // 🎮 Coach Gamification System - Track nudge acceptance
    await trackNudgeAction(activeNudge.nudge_type, 'accept')
    onAccept?.()
    // Navigate to guided meditation
    navigate('/guided-meditation')
  }

  const handleDismiss = async () => {
    await dismissNudge(activeNudge.id)
    onDismiss?.()
  }

  const getNudgeIcon = () => {
    switch (activeNudge.nudge_type) {
      case 'ai_coach':
        return <Brain className="h-6 w-6 text-white/90" />
      case 'smart_nudge':
        return <Sparkles className="h-6 w-6 text-white/90" />
      case 'daily_reminder':
        return <Calendar className="h-6 w-6 text-white/90" />
      default:
        return <Brain className="h-6 w-6 text-white/90" />
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
        subtitle={activeNudge.nudge_message}
        accent="breath"
        icon={getNudgeIcon()}
        ctaLabel="🌙 Embrace Stillness"
        onCta={handleAccept}
        footer={
          <Button
            onClick={handleDismiss}
            variant="outline"
            size="sm"
            className="px-4 text-white/70 hover:bg-white/10 border border-white/20"
          >
            Peacefully defer
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        className="absolute top-2 right-2 h-6 w-6 text-white/60 hover:text-white/90 hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}