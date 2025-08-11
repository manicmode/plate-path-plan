import React from 'react'
import { Loader2 } from 'lucide-react'

export const LoadingNudgeState: React.FC = () => {
  return (
    <div className="text-center py-8 px-4">
      <div className="flex justify-center">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
    </div>
  )
}