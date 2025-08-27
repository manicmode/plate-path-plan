import { Button } from "@/components/ui/button"
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
    // Navigate to sleep preparation
    navigate('/recovery/sleep')
  }

  const handleDismiss = () => {
    onDismiss?.()
  }

  return (
    <NudgeCard
      title={title}
      subtitle={message}
      accent="sleep"
      icon={<Moon className="h-6 w-6 text-white/90" />}
      ctaLabel="🌙 Wind Down"
      onCta={handleAccept}
      className="mb-6"
      footer={
        <Button
          onClick={handleDismiss}
          size="sm"
          variant="ghost"
          className="flex-1 sm:flex-none text-xs sm:text-sm px-3 text-white/70 hover:bg-white/10 border border-white/20"
        >
          Not tonight
        </Button>
      }
    />
  )
}