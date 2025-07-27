import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface SleepNudge {
  id: string
  user_id: string
  nudge_type: string
  nudge_reason: string
  nudge_message: string
  user_action: string
  created_at: string
  updated_at?: string
}

interface NudgeDisplayHook {
  recentNudges: SleepNudge[]
  activeNudge: SleepNudge | null
  loading: boolean
  acceptNudge: (nudgeId: string) => Promise<void>
  dismissNudge: (nudgeId: string) => Promise<void>
  markAsIgnored: (nudgeId: string) => Promise<void>
  refreshNudges: () => Promise<void>
}

export const useSleepNudgeDisplay = (): NudgeDisplayHook => {
  const [recentNudges, setRecentNudges] = useState<SleepNudge[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchNudges = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch nudges from the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase
        .from('sleep_nudges')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching sleep nudges:', error)
        return
      }

      setRecentNudges(data || [])
    } catch (error) {
      console.error('Error in fetchNudges:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateNudgeAction = async (nudgeId: string, action: 'accepted' | 'dismissed' | 'ignored') => {
    try {
      const { error } = await supabase
        .from('sleep_nudges')
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
      console.error(`Error updating nudge action to ${action}:`, error)
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
        title: "Sweet dreams! 😴",
        description: "Time to wind down for peaceful sleep"
      })
    }
  }

  const dismissNudge = async (nudgeId: string) => {
    const success = await updateNudgeAction(nudgeId, 'dismissed')
    if (success) {
      toast({
        title: "Nudge dismissed",
        description: "We'll remind you later"
      })
    }
  }

  const markAsIgnored = async (nudgeId: string) => {
    await updateNudgeAction(nudgeId, 'ignored')
  }

  // Get the most recent pending nudge as the active one
  const activeNudge = recentNudges.find(nudge => nudge.user_action === 'pending') || null

  useEffect(() => {
    fetchNudges()

    // Set up real-time subscription for sleep nudges
    const channel = supabase
      .channel('sleep-nudges-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sleep_nudges'
        },
        () => {
          console.log('Sleep nudge updated, refreshing...')
          fetchNudges()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchNudges])

  return {
    recentNudges,
    activeNudge,
    loading,
    acceptNudge,
    dismissNudge,
    markAsIgnored,
    refreshNudges: fetchNudges
  }
}