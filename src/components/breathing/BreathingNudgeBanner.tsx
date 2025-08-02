import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, Brain, Calendar, Wind } from "lucide-react"
import { useBreathingNudgeDisplay } from "@/hooks/useBreathingNudgeDisplay"
import { useNavigate } from "react-router-dom"
import { useNudgeTracking } from "@/hooks/useNudgeTracking"

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
    onDismiss?.()
  }

  const getNudgeIcon = () => {
    switch (activeNudge.nudge_type) {
      case 'ai_coach':
        return <Brain className="h-6 w-6 text-white" />
      case 'daily_reminder':
        return <Calendar className="h-6 w-6 text-white" />
      default:
        return <Wind className="h-6 w-6 text-white" />
    }
  }

  const getBannerStyle = () => {
    switch (activeNudge.nudge_type) {
      case 'ai_coach':
        return "bg-gradient-to-r from-violet-500 to-purple-600"
      case 'daily_reminder':
        return "bg-gradient-to-r from-blue-500 to-cyan-600"
      default:
        return "bg-gradient-to-r from-emerald-500 to-teal-600"
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
    <Card className={`${getBannerStyle()} p-6 text-white border-0 shadow-lg mb-6`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-2 bg-white/20 rounded-full">
          {getNudgeIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-2">
            {getTitle()}
          </h3>
          <p className="text-white/90 mb-4 leading-relaxed">
            {activeNudge.nudge_message}
          </p>
          
          <div className="flex gap-3">
            <Button
              onClick={handleAccept}
              className="bg-white text-gray-900 hover:bg-white/90 font-medium"
            >
              <Heart className="h-4 w-4 mr-2" />
              Let's Breathe
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              className="text-white hover:bg-white/20 border border-white/30"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}