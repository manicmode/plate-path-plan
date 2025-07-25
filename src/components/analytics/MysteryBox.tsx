import React, { useState, useEffect } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRewards, type Reward } from '@/contexts/RewardsContext';
import { RewardModal } from './RewardModal';
import { cn } from '@/lib/utils';

interface MysteryBoxProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export function MysteryBox({ position = 'top-right', className }: MysteryBoxProps) {
  const { canClaimBox, claimMysteryBox, timeUntilNextBox } = useRewards();
  const [showModal, setShowModal] = useState(false);
  const [claimedReward, setClaimedReward] = useState<Reward | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Don't render if box can't be claimed and no countdown needed
  if (!canClaimBox && timeUntilNextBox <= 0) {
    return null;
  }

  const handleBoxClick = () => {
    if (!canClaimBox) return;
    
    setIsAnimating(true);
    
    // Delay to show the click animation
    setTimeout(() => {
      const reward = claimMysteryBox();
      if (reward) {
        setClaimedReward(reward);
        setShowModal(true);
      }
      setIsAnimating(false);
    }, 300);
  };

  const formatTimeLeft = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <>
      <div 
        className={cn(
          "fixed z-50 select-none",
          positionClasses[position],
          className
        )}
      >
        <div
          className={cn(
            "relative cursor-pointer transition-all duration-300",
            canClaimBox ? "hover:scale-110" : "cursor-not-allowed opacity-60",
            isAnimating && "animate-pulse scale-95"
          )}
          onClick={handleBoxClick}
        >
          {/* Sparkle Aura */}
          {canClaimBox && (
            <>
              <div className="absolute -inset-2 animate-pulse">
                <Sparkles className="h-4 w-4 text-yellow-400 absolute -top-1 -left-1 animate-bounce" style={{ animationDelay: '0ms' }} />
                <Sparkles className="h-3 w-3 text-purple-400 absolute -top-1 -right-1 animate-bounce" style={{ animationDelay: '200ms' }} />
                <Sparkles className="h-4 w-4 text-blue-400 absolute -bottom-1 -left-1 animate-bounce" style={{ animationDelay: '400ms' }} />
                <Sparkles className="h-3 w-3 text-pink-400 absolute -bottom-1 -right-1 animate-bounce" style={{ animationDelay: '600ms' }} />
              </div>
              
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-purple-500 to-pink-500 rounded-xl blur-md opacity-30 animate-pulse" />
            </>
          )}
          
          {/* Main Box */}
          <div 
            className={cn(
              "relative w-16 h-16 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-xl shadow-xl",
              "flex items-center justify-center transform transition-transform duration-300",
              canClaimBox ? "animate-mystery-float" : ""
            )}
          >
            <Gift className="h-8 w-8 text-white drop-shadow-lg" />
            
            {/* Ribbon */}
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 transform rotate-45 opacity-80" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 transform rotate-45" />
          </div>
          
          {/* Countdown Badge */}
          {!canClaimBox && timeUntilNextBox > 0 && (
            <Badge 
              variant="secondary" 
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs bg-background/90 backdrop-blur-sm"
            >
              {formatTimeLeft(timeUntilNextBox)}
            </Badge>
          )}
          
          {/* Claim Available Badge */}
          {canClaimBox && (
            <Badge 
              variant="default" 
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs bg-green-500 text-white animate-pulse"
            >
              Click Me!
            </Badge>
          )}
        </div>
      </div>

      {/* Reward Modal */}
      <RewardModal
        open={showModal}
        onOpenChange={setShowModal}
        reward={claimedReward}
      />
    </>
  );
}