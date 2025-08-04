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
        return <Brain className="h-5 w-5 text-blue-600" />
      case 'smart_nudge':
        return <Sparkles className="h-5 w-5 text-purple-600" />
      case 'daily_reminder':
        return <Calendar className="h-5 w-5 text-green-600" />
      default:
        return <Brain className="h-5 w-5 text-blue-600" />
    }
  }

  const getBannerStyle = () => {
    switch (activeNudge.nudge_type) {
      case 'ai_coach':
        return 'from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-300 dark:border-blue-800 shadow-lg'
      case 'smart_nudge':
        return 'from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-300 dark:border-purple-800 shadow-lg'
      case 'daily_reminder':
        return 'from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-800 shadow-lg'
      default:
        return 'from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-300 dark:border-blue-800 shadow-lg'
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

  console.log('MeditationNudgeBanner render:', { 
    activeNudge: activeNudge?.nudge_type, 
    bannerStyle: getBannerStyle(),
    isMobile 
  });

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 animate-slide-down ${isMobile ? 'max-w-full' : 'max-w-lg mx-auto'}`}>
      <Card className={`relative overflow-hidden p-4 rounded-xl shadow-md ${
        'bg-slate-100 text-slate-900 border border-slate-200 dark:bg-neutral-900 dark:text-white dark:border-neutral-700'
      }`}>
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              {getNudgeIcon()}
              <span className="font-semibold text-slate-800 dark:text-gray-200 text-sm">
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
          
          <p className="text-slate-700 dark:text-slate-200 text-sm mb-4 leading-relaxed">
            {activeNudge.nudge_message}
          </p>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleAccept}
              size="sm"
              className="flex-1 bg-slate-800 text-white hover:bg-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {/* 🎭 Coach Personality Nudge - Recovery Coach: Gentle, soothing, poetic */}
              🌙 Embrace Stillness
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="px-4 text-slate-600 hover:bg-slate-200 border-slate-300 dark:text-slate-300 dark:hover:bg-neutral-800 dark:border-neutral-600"
            >
              Peacefully defer
            </Button>
          </div>
        </div>
        
        {/* Subtle animation border */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse opacity-30" />
      </Card>
    </div>
  )
}