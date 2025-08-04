import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, Brain, Calendar, Sparkles } from 'lucide-react'
import { useMeditationNudgeDisplay } from '@/hooks/useMeditationNudgeDisplay'
import { useIsMobile } from '@/hooks/use-mobile'
import { useNudgeTracking } from '@/hooks/useNudgeTracking'

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
        return <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      case 'smart_nudge':
        return <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      case 'daily_reminder':
        return <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
      default:
        return <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    }
  }

  const getBannerStyle = () => {
    switch (activeNudge.nudge_type) {
      case 'ai_coach':
        return 'from-blue-200 to-indigo-200 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-400 dark:border-blue-800'
      case 'smart_nudge':
        return 'from-purple-200 to-pink-200 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-400 dark:border-purple-800'
      case 'daily_reminder':
        return 'from-green-200 to-emerald-200 dark:from-green-900/20 dark:to-emerald-900/20 border-green-400 dark:border-green-800'
      default:
        return 'from-blue-200 to-indigo-200 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-400 dark:border-blue-800'
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
      <div className={`relative overflow-hidden bg-gradient-to-r ${getBannerStyle()} shadow-lg border backdrop-blur-sm rounded-lg`}>
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              {getNudgeIcon()}
              <span className="font-semibold text-gray-900 dark:text-gray-200 text-sm">
                {getTitle()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-gray-900 dark:text-gray-300 text-sm mb-4 leading-relaxed">
            {activeNudge.nudge_message}
          </p>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleAccept}
              size="sm"
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white !text-white"
            >
              {/* 🎭 Coach Personality Nudge - Recovery Coach: Gentle, soothing, poetic */}
              🌙 Embrace Stillness
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="px-4 border-gray-400 text-gray-700 hover:bg-gray-100 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/10"
            >
              Peacefully defer
            </Button>
          </div>
        </div>
        
        {/* Subtle animation border */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse opacity-30" />
      </div>
    </div>
  )
}