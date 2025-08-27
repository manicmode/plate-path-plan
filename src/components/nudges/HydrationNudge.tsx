import { Droplets } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { NudgeCard } from "@/components/nudges/NudgeCard"

interface HydrationNudgeProps {
  onAccept?: () => void
  onDismiss?: () => void
  title?: string
  message?: string
}

export const HydrationNudge = ({ 
  onAccept, 
  onDismiss, 
  title = "Time to Hydrate",
  message = "Your body needs water to function optimally. Take a moment to hydrate and refresh yourself."
}: HydrationNudgeProps) => {
  const navigate = useNavigate()

  const handleAccept = () => {
    onAccept?.()
    navigate('/?tab=hydration')
  }

  const handleDismiss = () => {
    onDismiss?.()
  }

  return (
    <NudgeCard
      title={title}
      icon={<Droplets className="h-5 w-5" />}
      tone="success"
      cta={{
        label: "💧 Hydrate Now",
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
          Later
        </button>
      </div>
    </NudgeCard>
  )
}