import { Activity } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { NudgeCard } from "@/components/nudges/NudgeCard"

interface MovementNudgeProps {
  onAccept?: () => void
  onDismiss?: () => void
  title?: string
  message?: string
}

export const MovementNudge = ({ 
  onAccept, 
  onDismiss, 
  title = "Time to Move",
  message = "Your body craves movement. Stand up, stretch, and get your blood flowing for better energy and focus."
}: MovementNudgeProps) => {
  const navigate = useNavigate()

  const handleAccept = () => {
    onAccept?.()
    navigate('/exercise')
  }

  const handleDismiss = () => {
    onDismiss?.()
  }

  return (
    <NudgeCard
      title={title}
      icon={<Activity className="h-5 w-5" />}
      tone="warn"
      cta={{
        label: "🏃 Get Moving",
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
          Skip for now
        </button>
      </div>
    </NudgeCard>
  )
}