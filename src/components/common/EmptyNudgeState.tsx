import React from 'react'
import { Brain, MessageSquare, Sparkles } from 'lucide-react'

interface EmptyNudgeStateProps {
  message?: string
  type?: 'nutrition' | 'fitness' | 'general'
}

export const EmptyNudgeState: React.FC<EmptyNudgeStateProps> = ({ 
  message = "No recent suggestions available",
  type = 'general'
}) => {
  const getIcon = () => {
    switch (type) {
      case 'nutrition':
        return <Brain className="h-8 w-8 text-purple-400 opacity-50" />
      case 'fitness':
        return <Sparkles className="h-8 w-8 text-indigo-400 opacity-50" />
      default:
        return <MessageSquare className="h-8 w-8 text-muted-foreground opacity-50" />
    }
  }

  const getContextualMessage = () => {
    switch (type) {
      case 'nutrition':
        return "Continue tracking your nutrition and I'll provide personalized suggestions to help you reach your goals!"
      case 'fitness':
        return "Keep logging your workouts and I'll offer smart recommendations to optimize your training!"
      default:
        return message
    }
  }

  return (
    <div className="text-center py-8 px-4">
      <div className="flex justify-center mb-3">
        {getIcon()}
      </div>
      <p className="text-sm text-muted-foreground mb-2 font-medium">
        {message}
      </p>
      <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto leading-relaxed">
        {getContextualMessage()}
      </p>
    </div>
  )
}