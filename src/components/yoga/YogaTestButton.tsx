import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Play, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useRecoveryChallenge } from '@/hooks/useRecoveryChallenge'
import { useXPSystem } from '@/hooks/useXPSystem'

export const YogaTestButton = () => {
  const { user } = useAuth()
  const { trackRecoveryActivity } = useRecoveryChallenge()
  const { awardRecoveryXP } = useXPSystem()
  const [isLogging, setIsLogging] = useState(false)
  const [lastLoggedStreak, setLastLoggedStreak] = useState<any>(null)

  const handleLogSession = async () => {
    if (!user?.id) {
      toast.error('Please log in to track your yoga sessions')
      return
    }

    setIsLogging(true)

    try {
      const { data, error } = await supabase.functions.invoke('log-yoga-session', {
        body: { userId: user.id }
      })

      if (error) throw error

      console.log('Yoga session logged:', data)
      setLastLoggedStreak(data.streak)
      
      // Track recovery challenge progress
      await trackRecoveryActivity({
        category: 'yoga',
        sessionId: data.sessionId || 'manual-log',
        completedAt: new Date().toISOString(),
        duration: 20, // Default yoga session duration
        notes: 'Yoga session completed'
      })

      // Award XP for yoga session completion
      await awardRecoveryXP('yoga', data.sessionId || 'yoga-session', 20);
      
      if (data.message.includes('already completed')) {
        toast.info('You already completed a yoga session today!')
      } else {
        toast.success(`Yoga session logged! Current streak: ${data.streak?.current_streak || 0} days`)
      }
    } catch (error) {
      console.error('Error logging yoga session:', error)
      toast.error('Failed to log yoga session. Please try again.')
    } finally {
      setIsLogging(false)
    }
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200 dark:border-purple-800">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Test Yoga Session</h3>
            <p className="text-sm text-muted-foreground">
              Log a test session to update your streak
            </p>
          </div>
          
          <Button 
            onClick={handleLogSession}
            disabled={isLogging}
            className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white"
          >
            {isLogging ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Logging...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Log Test Session
              </>
            )}
          </Button>
        </div>

        {lastLoggedStreak && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800 dark:text-green-200">
              Session logged! Streak: {lastLoggedStreak.current_streak} days, 
              Total: {lastLoggedStreak.total_sessions} sessions
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}