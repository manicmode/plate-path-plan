import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, Brain, Calendar, Wind } from "lucide-react"
import { useBreathingNudgeDisplay } from "@/hooks/useBreathingNudgeDisplay"
import { useNavigate } from "react-router-dom"
import { useNudgeTracking } from "@/hooks/useNudgeTracking"
import { useTheme } from "next-themes"

interface BreathingNudgeBannerProps {
  onAccept?: () => void
  onDismiss?: () => void
}

export const BreathingNudgeBanner = ({ onAccept, onDismiss }: BreathingNudgeBannerProps) => {
  const { activeNudge, acceptNudge, dismissNudge } = useBreathingNudgeDisplay()
  const navigate = useNavigate()
  const { theme } = useTheme()
  // 🎮 Coach Gamification System
  const { trackNudgeAction } = useNudgeTracking()

  const isLightMode = theme === 'light'

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
    // Navigate to breathing tab for gentle sessions
    navigate('/recovery/breathing')
  }

  const getNudgeIcon = () => {
    const iconColor = isLightMode ? "text-slate-700" : "text-white"
    switch (activeNudge.nudge_type) {
      case 'ai_coach':
        return <Brain className={`h-6 w-6 ${iconColor}`} />
      case 'daily_reminder':
        return <Calendar className={`h-6 w-6 ${iconColor}`} />
      default:
        return <Wind className={`h-6 w-6 ${iconColor}`} />
    }
  }

  const getBannerStyle = () => {
    if (isLightMode) {
      switch (activeNudge.nudge_type) {
        case 'ai_coach':
          return "bg-gradient-to-r from-violet-100 to-purple-100 border border-violet-300 shadow-lg"
        case 'daily_reminder':
          return "bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-300 shadow-lg"
        default:
          return "bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-300 shadow-lg"
      }
    }
    
    // Dark mode styles
    switch (activeNudge.nudge_type) {
      case 'ai_coach':
        return "bg-gradient-to-r from-violet-500 to-purple-600 shadow-lg"
      case 'daily_reminder':
        return "bg-gradient-to-r from-blue-500 to-cyan-600 shadow-lg"
      default:
        return "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg"
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

  console.log('BreathingNudgeBanner render:', { 
    isLightMode, 
    activeNudge: activeNudge?.nudge_type, 
    bannerStyle: getBannerStyle() 
  });

  return (
    <Card 
      className={`${getBannerStyle()} p-6 ${isLightMode ? 'text-slate-900' : 'text-white border-0'} mb-6`}
      style={{ background: isLightMode ? 'var(--gradient-breathe-nudge)' : undefined }}
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 p-2 ${isLightMode ? 'bg-slate-200/80' : 'bg-white/20'} rounded-full`}>
          {getNudgeIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-lg mb-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
            {getTitle()}
          </h3>
          <p className={`${isLightMode ? 'text-slate-800' : 'text-white/90'} mb-4 leading-relaxed`}>
            {activeNudge.nudge_message}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              onClick={handleAccept}
              size="sm"
              className={`${isLightMode 
                ? 'bg-slate-800 text-white hover:bg-slate-900' 
                : 'bg-white text-gray-900 hover:bg-white/90'
              } font-medium flex-1 sm:flex-none`}
            >
              {/* 🎭 Coach Personality Nudge - Recovery Coach: Gentle, soothing, poetic */}
              <Heart className="h-4 w-4 mr-2" />
              Sacred Breath
            </Button>
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className={`${isLightMode 
                ? 'text-slate-700 hover:bg-slate-200/50 border border-slate-300' 
                : 'text-white hover:bg-white/20 border border-white/30'
              } flex-1 sm:flex-none text-xs sm:text-sm px-3`}
            >
              In gentle time
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}