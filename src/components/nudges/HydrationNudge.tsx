import { Button } from "@/components/ui/button"
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
    // Navigate to hydration tracking
    navigate('/?tab=hydration')
  }

  const handleDismiss = () => {
    onDismiss?.()
  }

  return (
    <NudgeCard
      title={title}
      subtitle={message}
      accent="hydrate"
      icon={<Droplets className="h-6 w-6 text-white/90" />}
      ctaLabel="💧 Hydrate Now"
      onCta={handleAccept}
      className="mb-6"
      footer={
        <Button
          onClick={handleDismiss}
          size="sm"
          variant="ghost"
          className="flex-1 sm:flex-none text-xs sm:text-sm px-3 text-white/70 hover:bg-white/10 border border-white/20"
        >
          Later
        </Button>
      }
    />
  )
}