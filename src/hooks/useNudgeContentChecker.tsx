import { useMeditationNudgeDisplay } from '@/hooks/useMeditationNudgeDisplay'
import { useBreathingNudgeDisplay } from '@/hooks/useBreathingNudgeDisplay'
import { useYogaNudgeDisplay } from '@/hooks/useYogaNudgeDisplay'
import { useSleepNudgeDisplay } from '@/hooks/useSleepNudgeDisplay'
import { useThermotherapyNudgeDisplay } from '@/hooks/useThermotherapyNudgeDisplay'
import { useCoachCta } from '@/hooks/useCoachCta'

interface NudgeContentState {
  hasMeditationContent: boolean
  hasBreathingContent: boolean
  hasYogaContent: boolean
  hasSleepContent: boolean
  hasThermotherapyContent: boolean
  hasRecoveryContent: boolean
  hasAnyContent: boolean
  isLoading: boolean
}

interface NudgeProps {
  maxEntries?: number
  showOnlyRecent?: boolean
}

export const useNudgeContentChecker = (props: NudgeProps = {}): NudgeContentState => {
  const { maxEntries = 5, showOnlyRecent = true } = props

  // Get data from all nudge hooks with loading states
  const { recentNudges: meditationNudges, loading: meditationLoading } = useMeditationNudgeDisplay()
  const { recentNudges: breathingNudges, loading: breathingLoading } = useBreathingNudgeDisplay()
  const { recentNudges: yogaNudges, loading: yogaLoading } = useYogaNudgeDisplay()
  const { visibleNudges: sleepNudges } = useSleepNudgeDisplay({ showOnlyRecent, maxEntries })
  const { recentNudges: thermotherapyNudges, loading: thermotherapyLoading } = useThermotherapyNudgeDisplay()
  const { getQueueInfo } = useCoachCta()
  const { currentMessage: recoveryMessage } = getQueueInfo()

  // Helper function to filter nudges
  const filterNudges = (nudges: any[]) => {
    if (!nudges || !Array.isArray(nudges)) return []
    return nudges
      .filter(nudge => {
        if (showOnlyRecent) {
          const nudgeAge = Date.now() - new Date(nudge.created_at).getTime()
          return nudgeAge < 3 * 24 * 60 * 60 * 1000 // Last 3 days
        }
        return true
      })
      .filter(nudge => nudge.nudge_type === 'ai_coach' || nudge.nudge_type === 'smart_nudge')
      .slice(0, maxEntries)
  }

  // Check if any hooks are still loading
  const isLoading = meditationLoading || breathingLoading || yogaLoading || thermotherapyLoading

  // Check content for each nudge type
  const hasMeditationContent = filterNudges(meditationNudges).length > 0
  const hasBreathingContent = filterNudges(breathingNudges).length > 0
  const hasYogaContent = filterNudges(yogaNudges).length > 0
  const hasSleepContent = sleepNudges.length > 0
  const hasThermotherapyContent = filterNudges(thermotherapyNudges).length > 0
  const hasRecoveryContent = !!recoveryMessage

  const hasAnyContent = hasMeditationContent || hasBreathingContent || hasYogaContent || 
                       hasSleepContent || hasThermotherapyContent || hasRecoveryContent

  return {
    hasMeditationContent,
    hasBreathingContent,
    hasYogaContent,
    hasSleepContent,
    hasThermotherapyContent,
    hasRecoveryContent,
    hasAnyContent,
    isLoading
  }
}