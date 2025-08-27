import { Moon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { NudgeCard } from "@/components/nudges/NudgeCard"

interface SleepNudgeProps {
  onAccept?: () => void
  onDismiss?: () => void
  title?: string
  message?: string
}

export const SleepNudge = ({ 
  onAccept, 
  onDismiss, 
  title = "Prepare for Rest",
  message = "Quality sleep is essential for recovery and well-being. Start your evening wind-down routine for optimal rest."
}: SleepNudgeProps) => {
  const navigate = useNavigate()

  const handleAccept = () => {
    onAccept?.()
    navigate('/recovery/sleep')
  }

  const handleDismiss = () => {
    onDismiss?.()
  }

  return (
    <NudgeCard
      title={title}
      icon={<Moon className="h-5 w-5" />}
      tone="calm"
      cta={{
        label: "🌙 Wind Down",
        onClick: handleAccept
      }}
      onDismiss={handleDismiss}
      className="mb-6"
    >
      <p>{message}</p>
      
      {/* Secondary action */}
      <div className="mt-3">
        <button
          onClick={handleDismiss}
          className="rounded-xl px-3 py-1.5 bg-slate-900/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-900/10 dark:hover:bg-white/10 transition-colors"
        >
          Not tonight
        </button>
      </div>
    </NudgeCard>
  )
}