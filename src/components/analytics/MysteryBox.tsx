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
  // ✅ ALL HOOKS FIRST - No early returns before hooks
  const { canClaimBox, claimMysteryBox, timeUntilNextBox } = useRewards();
  const [showModal, setShowModal] = useState(false);
  const [claimedReward, setClaimedReward] = useState<Reward | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [floatingPosition, setFloatingPosition] = useState({
    bottom: 120,
    right: 80
  });
  const [isMoving, setIsMoving] = useState(false);
  const [movementInterval, setMovementInterval] = useState<NodeJS.Timeout | null>(null);

  // ✨ VERIFIED FIX: Immediate movement on mount + regular intervals (only when claimable)
  useEffect(() => {
    // 🔒 DOM GUARD: Only run on client side
    if (typeof window === 'undefined') return;
    
    // 🛑 STOP MOVEMENT: Don't move if box can't be claimed
    if (!canClaimBox) {
      if (movementInterval) {
        clearInterval(movementInterval);
        setMovementInterval(null);
      }
      return;
    }
    
    const generateNewPosition = () => {
      setIsMoving(true);
      
      const newPosition = {
        bottom: Math.floor(Math.random() * 250) + 100, // Min: 100px (above nav), Max: 350px
        right: Math.floor(Math.random() * 140) + 10     // Min: 10px, Max: 150px (stays on screen)
      };
      
      console.log('🎁 Gift box moving to new position:', newPosition);
      setFloatingPosition(newPosition);
      
      // Reset moving state after transition completes
      setTimeout(() => setIsMoving(false), 800);
    };

    // 🔧 IMMEDIATE MOVEMENT on mount - no waiting
    generateNewPosition();
    
    // Continue moving every 5 seconds - only when claimable
    const interval = setInterval(generateNewPosition, 5000);
    setMovementInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [canClaimBox]); // Depend on canClaimBox to stop movement after claiming


  const handleBoxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎁 Gift clicked! Event details:', { 
      canClaimBox, 
      timeUntilNextBox,
      target: e.target,
      currentTarget: e.currentTarget 
    });
    
    if (!canClaimBox) {
      console.log('❌ Cannot claim box - not ready yet');
      return;
    }
    
    console.log('✅ Processing gift claim...');
    setIsAnimating(true);
    
    // Delay to show the click animation
    setTimeout(() => {
      const reward = claimMysteryBox();
      if (reward) {
        console.log('🎉 Reward claimed:', reward);
        setClaimedReward(reward);
        setShowModal(true);
      }
      setIsAnimating(false);
    }, 300);
  };

  // ✅ CONDITIONAL RENDERING: Hide box during cooldown period
  if (!canClaimBox) {
    return <></>;
  }

  const formatTimeLeft = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // 🎯 GLOBAL FIXED POSITIONING - Never wrapped in relative containers
  return (
    <>
      <div
        id="gift-box"
        onClick={handleBoxClick}
        className={cn(
          'fixed w-16 h-16 rounded-full cursor-pointer z-[99999]',
          'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500',
          'shadow-lg shadow-amber-500/50 hover:shadow-xl hover:shadow-amber-500/60',
          'border-2 border-white/30 backdrop-blur-sm',
          'flex items-center justify-center',
          'transition-all duration-800 ease-in-out',
          'hover:scale-110 active:scale-95',
          'animate-pulse',
          isAnimating && 'scale-125 rotate-12',
          className
        )}
        style={{
          bottom: `${floatingPosition.bottom}px`,
          right: `${floatingPosition.right}px`,
          pointerEvents: 'auto'
        }}
      >
        <Gift 
          size={28} 
          className="text-white drop-shadow-md" 
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Sparkle effects */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full opacity-80 animate-ping" />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-amber-200 rounded-full opacity-60 animate-ping" style={{ animationDelay: '0.5s' }} />
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