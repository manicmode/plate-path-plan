import { Button } from "@/components/ui/button"
import { Heart, Brain, Calendar, Wind } from "lucide-react"
import { useBreathingNudgeDisplay } from "@/hooks/useBreathingNudgeDisplay"
import { useNavigate } from "react-router-dom"
import { useNudgeTracking } from "@/hooks/useNudgeTracking"
import { NudgeCard } from "@/components/nudges/NudgeCard"

interface BreathingNudgeBannerProps {
  onAccept?: () => void
  onDismiss?: () => void
}

export const BreathingNudgeBanner = ({ onAccept, onDismiss }: BreathingNudgeBannerProps) => {
  const { activeNudge, acceptNudge, dismissNudge } = useBreathingNudgeDisplay()
  const navigate = useNavigate()
  // 🎮 Coach Gamification System
  const { trackNudgeAction } = useNudgeTracking()

  if (!activeNudge) return null

  const handleAccept = async () => {
    await acceptNudge(activeNudge.id)
    // 🎮 Coach Gamification System - Track nudge acceptance
    await trackNudgeAction(activeNudge.nudge_type, 'accept')
    onAccept?.()
    // Navigate to breathing tab
    navigate('/recovery/breathing')
  }

  const handleDismiss = async () => {
    await dismissNudge(activeNudge.id)
    // 🎮 Coach Gamification System - Track nudge dismissal  
    await trackNudgeAction(activeNudge.nudge_type, 'dismiss')
    onDismiss?.()
    // Don't navigate anywhere - just dismiss the nudge
  }

  const getNudgeIcon = () => {
    switch (activeNudge.nudge_type) {
      case 'ai_coach':
        return <Brain className="h-6 w-6 text-white/90" />
      case 'daily_reminder':
        return <Calendar className="h-6 w-6 text-white/90" />
      default:
        return <Wind className="h-6 w-6 text-white/90" />
    }
  }

  const getTitle = () => {
    switch (activeNudge.nudge_type) {
      case 'ai_coach':
        return "AI Coach Suggestion"
      case 'daily_reminder':
        return "Daily Breathing Reminder"
      default:
        return "Time to Breathe"
    }
  }

  return (
    <NudgeCard
      title={getTitle()}
      subtitle={activeNudge.nudge_message}
      accent="breath"
      icon={getNudgeIcon()}
      ctaLabel="Sacred Breath"
      onCta={handleAccept}
      className="mb-6"
      footer={
        <Button
          onClick={handleDismiss}
          size="sm"
          variant="ghost"
          className="flex-1 sm:flex-none text-xs sm:text-sm px-3 text-white/70 hover:bg-white/10 border border-white/20"
        >
          In gentle time
        </Button>
      }
    />
  )
}