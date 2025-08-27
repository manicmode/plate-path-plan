import { Button } from "@/components/ui/button"
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
    // Navigate to exercise tracking
    navigate('/exercise')
  }

  const handleDismiss = () => {
    onDismiss?.()
  }

  return (
    <NudgeCard
      title={title}
      subtitle={message}
      accent="move"
      icon={<Activity className="h-6 w-6 text-white/90" />}
      ctaLabel="🏃 Get Moving"
      onCta={handleAccept}
      className="mb-6"
      footer={
        <Button
          onClick={handleDismiss}
          size="sm"
          variant="ghost"
          className="flex-1 sm:flex-none text-xs sm:text-sm px-3 text-white/70 hover:bg-white/10 border border-white/20"
        >
          Skip for now
        </Button>
      }
    />
  )
}