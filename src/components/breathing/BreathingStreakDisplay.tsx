import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wind, Trophy, Calendar, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { supabase } from '@/integrations/supabase/client'
import { formatDistanceToNow, format } from 'date-fns'

interface BreathingStreak {
  user_id: string
  total_sessions: number
  current_streak: number
  longest_streak: number
  last_completed_date: string | null
  created_at: string
  updated_at: string
}

const motivationalMessages = [
  "Keep the rhythm, you're doing amazing!",
  "Every breath counts!",
  "You're building a calmer you!",
  "Breathe in peace, breathe out stress",
  "Your consistency is inspiring!",
  "One breath at a time, one day at a time",
  "You're creating healthy habits!",
  "Your dedication is paying off!"
]

export const BreathingStreakDisplay = () => {
  const { user } = useAuth()
  const [streakData, setStreakData] = useState<BreathingStreak | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentMessage, setCurrentMessage] = useState(motivationalMessages[0])

  // Rotate motivational messages every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)])
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  // Fetch breathing streak data
  useEffect(() => {
    const fetchStreakData = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('breathing_streaks')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Error fetching breathing streak:', error)
          return
        }

        setStreakData(data)
      } catch (error) {
        console.error('Error fetching breathing streak:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStreakData()

    // Set up real-time subscription for breathing streaks updates
    const channel = supabase
      .channel('breathing-streaks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'breathing_streaks',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Breathing streak updated:', payload)
          if (payload.eventType === 'DELETE') {
            setStreakData(null)
          } else {
            setStreakData(payload.new as BreathingStreak)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-cyan-200 dark:bg-cyan-800 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-32 bg-cyan-200 dark:bg-cyan-800 rounded animate-pulse" />
            <div className="h-4 w-24 bg-cyan-200 dark:bg-cyan-800 rounded animate-pulse" />
          </div>
        </div>
      </Card>
    )
  }

  if (!streakData) {
    return (
      <Card className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Wind className="h-8 w-8 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-foreground">Start Your Breathing Journey</h3>
          <p className="text-muted-foreground">No streak yet. Start your first session today!</p>
          <Badge variant="secondary" className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">
            ✨ Every breath is a new beginning
          </Badge>
        </div>
      </Card>
    )
  }

  const formatLastSessionDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return format(date, 'MMM d')
    }
  }

  const getStreakGlow = (streak: number) => {
    if (streak >= 30) return 'shadow-[0_0_30px_rgba(6,182,212,0.6)]'
    if (streak >= 14) return 'shadow-[0_0_25px_rgba(6,182,212,0.5)]'
    if (streak >= 7) return 'shadow-[0_0_20px_rgba(6,182,212,0.4)]'
    if (streak >= 3) return 'shadow-[0_0_15px_rgba(6,182,212,0.3)]'
    return 'shadow-[0_0_10px_rgba(6,182,212,0.2)]'
  }

  return (
    <Card className={`p-6 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800 animate-fade-in ${getStreakGlow(streakData.current_streak)}`}>
      <div className="space-y-4">
        {/* Current Streak - Main Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center animate-scale-in">
                <Wind className="h-8 w-8 text-white" />
              </div>
              {streakData.current_streak > 0 && (
                <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">🔥</span>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-foreground">
                  {streakData.current_streak} Day{streakData.current_streak !== 1 ? 's' : ''}
                </h3>
                {streakData.current_streak > 0 && (
                  <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                    Current Streak
                  </Badge>
                )}
              </div>
              
              {/* Longest Streak */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>Longest: {streakData.longest_streak} day{streakData.longest_streak !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="text-right space-y-1">
            <Badge variant="outline" className="border-cyan-300 text-cyan-700 dark:border-cyan-600 dark:text-cyan-300">
              {streakData.total_sessions} total session{streakData.total_sessions !== 1 ? 's' : ''}
            </Badge>
            
            {streakData.last_completed_date && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Last: {formatLastSessionDate(streakData.last_completed_date)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Streak Progress Bar */}
        {streakData.current_streak > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress to next milestone</span>
              <span>
                {streakData.current_streak >= 30 ? '🌟 Amazing!' : 
                 streakData.current_streak >= 14 ? `${30 - streakData.current_streak} days to 30` :
                 streakData.current_streak >= 7 ? `${14 - streakData.current_streak} days to 14` :
                 streakData.current_streak >= 3 ? `${7 - streakData.current_streak} days to 7` :
                 `${3 - streakData.current_streak} days to 3`}
              </span>
            </div>
            <div className="h-2 bg-cyan-100 dark:bg-cyan-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${Math.min(100, ((streakData.current_streak % 7) / 7) * 100)}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Motivational Message */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-cyan-200/50 dark:border-cyan-800/50">
          <Sparkles className="h-4 w-4 text-cyan-500 animate-pulse" />
          <p className="text-sm text-muted-foreground italic transition-all duration-300">
            {currentMessage}
          </p>
        </div>
      </div>
    </Card>
  )
}