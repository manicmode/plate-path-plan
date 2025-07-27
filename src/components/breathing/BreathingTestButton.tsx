import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export const BreathingTestButton = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLogging, setIsLogging] = useState(false)
  const [streak, setStreak] = useState<any>(null)

  const handleLogSession = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to track sessions",
        variant: "destructive"
      })
      return
    }

    setIsLogging(true)
    try {
      const { data, error } = await supabase.functions.invoke('log-breathing-session', {
        body: { userId: user.id }
      })

      if (error) throw error

      setStreak(data.streak)
      toast({
        title: "Session logged! 🫁",
        description: data.message || "Breathing session recorded successfully"
      })

    } catch (error) {
      console.error('Error logging breathing session:', error)
      toast({
        title: "Error logging session",
        description: "Please try again",
        variant: "destructive"
      })
    } finally {
      setIsLogging(false)
    }
  }

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Play className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="font-semibold text-foreground">Test Breathing Session</h3>
            <p className="text-sm text-muted-foreground">Log a test session to track your breathing streaks</p>
            {streak && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  Current: {streak.current_streak} day{streak.current_streak !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Longest: {streak.longest_streak} day{streak.longest_streak !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Total: {streak.total_sessions} session{streak.total_sessions !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </div>
        </div>
        <Button
          onClick={handleLogSession}
          disabled={isLogging}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          {isLogging ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isLogging ? 'Logging...' : 'Log Test Session'}
        </Button>
      </div>
    </div>
  )
}