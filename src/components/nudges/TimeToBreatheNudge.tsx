import { Wind, Heart } from "lucide-react"
import { useBreathingNudgeDisplay } from "@/hooks/useBreathingNudgeDisplay"
import { useNavigate } from "react-router-dom"
import { useNudgeTracking } from "@/hooks/useNudgeTracking"
import { NudgeCard } from "@/components/nudges/NudgeCard"

interface TimeToBreatheNudgeProps {
  onAccept?: () => void
  onDismiss?: () => void
}

export const TimeToBreatheNudge = ({ onAccept, onDismiss }: TimeToBreatheNudgeProps) => {
  const { activeNudge, acceptNudge, dismissNudge } = useBreathingNudgeDisplay()
  const navigate = useNavigate()
  const { trackNudgeAction } = useNudgeTracking()

  if (!activeNudge) return null

  const handleAccept = async () => {
    await acceptNudge(activeNudge.id)
    await trackNudgeAction(activeNudge.nudge_type, 'accept')
    onAccept?.()
    navigate('/recovery/breathing')
  }

  const handleDismiss = async () => {
    await dismissNudge(activeNudge.id)
    await trackNudgeAction(activeNudge.nudge_type, 'dismiss')
    onDismiss?.()
  }

  return (
    <NudgeCard
      title="Time to Breathe"
      icon={<Wind className="h-5 w-5" />}
      tone="calm"
      cta={{
        label: "Sacred Breath",
        onClick: handleAccept,
        icon: <Heart className="h-4 w-4" />
      }}
      onDismiss={handleDismiss}
      className="mb-6"
    >
      <p>{activeNudge.nudge_message}</p>
      
      {/* Secondary action */}
      <div className="mt-3">
        <button
          onClick={handleDismiss}
          className="rounded-xl px-3 py-1.5 bg-slate-900/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-900/10 dark:hover:bg-white/10 transition-colors"
        >
          In gentle time
        </button>
      </div>
    </NudgeCard>
  )
}