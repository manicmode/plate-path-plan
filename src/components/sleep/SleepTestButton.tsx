import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Moon, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const SleepTestButton = () => {
  const { user } = useAuth()
  const [isLogging, setIsLogging] = useState(false)
  const [lastLoggedStreak, setLastLoggedStreak] = useState<any>(null)

  const handleLogSession = async () => {
    if (!user?.id) {
      toast.error('Please log in to track your sleep preparation')
      return
    }

    setIsLogging(true)

    try {
      const { data, error } = await supabase.functions.invoke('log-sleep-session', {
        body: { userId: user.id }
      })

      if (error) throw error

      console.log('Sleep session logged:', data)
      setLastLoggedStreak(data.streak)
      
      if (data.message.includes('already completed')) {
        toast.info('You already completed sleep preparation today!')
      } else {
        toast.success(`Sleep preparation logged! Current streak: ${data.streak?.current_streak || 0} nights`)
      }
    } catch (error) {
      console.error('Error logging sleep session:', error)
      toast.error('Failed to log sleep preparation. Please try again.')
    } finally {
      setIsLogging(false)
    }
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-200 dark:border-indigo-800">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Test Sleep Preparation</h3>
            <p className="text-sm text-muted-foreground">
              Log a test session to update your sleep streak
            </p>
          </div>
          
          <Button 
            onClick={handleLogSession}
            disabled={isLogging}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white"
          >
            {isLogging ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Logging...
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 mr-2" />
                Log Test Session
              </>
            )}
          </Button>
        </div>

        {lastLoggedStreak && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800 dark:text-green-200">
              Session logged! Streak: {lastLoggedStreak.current_streak} nights, 
              Total: {lastLoggedStreak.total_sessions} sessions
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}