import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface BreathingNudge {
  id: string
  user_id: string
  nudge_type: string
  nudge_reason: string
  nudge_message: string
  user_action: string
  created_at: string
  updated_at?: string
}

interface BreathingNudgeDisplayHook {
  recentNudges: BreathingNudge[]
  activeNudge: BreathingNudge | null
  loading: boolean
  acceptNudge: (nudgeId: string) => Promise<void>
  dismissNudge: (nudgeId: string) => Promise<void>
  markAsIgnored: (nudgeId: string) => Promise<void>
  refreshNudges: () => Promise<void>
}

export const useBreathingNudgeDisplay = (): BreathingNudgeDisplayHook => {
  const [recentNudges, setRecentNudges] = useState<BreathingNudge[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchNudges = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch nudges from the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase
        .from('breathing_nudges')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching breathing nudges:', error)
        return
      }

      setRecentNudges(data || [])
    } catch (error) {
      console.error('Error in fetchBreathingNudges:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateNudgeAction = async (nudgeId: string, action: 'accepted' | 'dismissed' | 'ignored') => {
    try {
      const { error } = await supabase
        .from('breathing_nudges')
        .update({ 
          user_action: action,
          updated_at: new Date().toISOString()
        })
        .eq('id', nudgeId)

      if (error) throw error

      // Update local state
      setRecentNudges(prev => 
        prev.map(nudge => 
          nudge.id === nudgeId 
            ? { ...nudge, user_action: action }
            : nudge
        )
      )

      return true
    } catch (error) {
      console.error(`Error updating breathing nudge action to ${action}:`, error)
      toast({
        title: "Error updating nudge",
        description: "Please try again",
        variant: "destructive"
      })
      return false
    }
  }

  const acceptNudge = async (nudgeId: string) => {
    const success = await updateNudgeAction(nudgeId, 'accepted')
    if (success) {
      toast({
        title: "Let's breathe! 🫁",
        description: "Perfect choice for your wellbeing"
      })
    }
  }

  const dismissNudge = async (nudgeId: string) => {
    await updateNudgeAction(nudgeId, 'dismissed')
  }

  const markAsIgnored = async (nudgeId: string) => {
    await updateNudgeAction(nudgeId, 'ignored')
  }

  const refreshNudges = async () => {
    setLoading(true)
    await fetchNudges()
  }

  useEffect(() => {
    fetchNudges()
  }, [fetchNudges])

  // Find the most recent active nudge (less than 24h old, not dismissed/accepted)
  const activeNudge = recentNudges.find(nudge => {
    const nudgeAge = Date.now() - new Date(nudge.created_at).getTime()
    const isRecent = nudgeAge < 24 * 60 * 60 * 1000 // 24 hours
    const isPending = nudge.user_action === 'pending'
    return isRecent && isPending
  }) || null

  // Auto-mark old pending nudges as ignored
  useEffect(() => {
    const markOldNudgesAsIgnored = async () => {
      const oldPendingNudges = recentNudges.filter(nudge => {
        const nudgeAge = Date.now() - new Date(nudge.created_at).getTime()
        const isOld = nudgeAge >= 24 * 60 * 60 * 1000 // 24 hours
        const isPending = nudge.user_action === 'pending'
        return isOld && isPending
      })

      for (const nudge of oldPendingNudges) {
        await markAsIgnored(nudge.id)
      }
    }

    if (recentNudges.length > 0) {
      markOldNudgesAsIgnored()
    }
  }, [recentNudges])

  return {
    recentNudges,
    activeNudge,
    loading,
    acceptNudge,
    dismissNudge,
    markAsIgnored,
    refreshNudges
  }
}