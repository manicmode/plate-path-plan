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

  // ✨ ALWAYS MOVE: Gift box moves regardless of claimable state for engagement
  useEffect(() => {
    // 🔒 DOM GUARD: Only run on client side
    if (typeof window === 'undefined') return;
    
    const generateNewPosition = () => {
      setIsMoving(true);
      
      const newPosition = {
        bottom: Math.floor(Math.random() * 200) + 120, // Min: 120px (above nav), Max: 320px
        right: Math.floor(Math.random() * 120) + 20     // Min: 20px, Max: 140px (stays on screen)
      };
      
      console.log('🎁 Gift box moving to new position:', newPosition, 'canClaim:', canClaimBox);
      setFloatingPosition(newPosition);
      
      // Reset moving state after transition completes
      setTimeout(() => setIsMoving(false), 800);
    };

    // 🔧 IMMEDIATE MOVEMENT on mount - no waiting
    generateNewPosition();
    
    // Continue moving every 4 seconds - always move for engagement
    const interval = setInterval(generateNewPosition, 4000);
    setMovementInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []); // No dependencies - always move


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

  // ✅ ALWAYS SHOW: Gift box is always visible for engagement

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
        style={{
          position: 'fixed',
          bottom: `${floatingPosition.bottom}px`,
          right: `${floatingPosition.right}px`,
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: canClaimBox 
            ? 'linear-gradient(135deg, #FFB200, #FF7F00)'
            : 'linear-gradient(135deg, #666, #999)',
          boxShadow: canClaimBox 
            ? '0 0 12px 4px rgba(255, 174, 0, 0.4)'
            : '0 0 8px 2px rgba(128, 128, 128, 0.3)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999,
          cursor: canClaimBox ? 'pointer' : 'not-allowed',
          animation: canClaimBox ? 'gift-pulse 2s infinite' : 'none',
          transition: 'bottom 0.8s ease, right 0.8s ease, transform 0.2s ease',
          opacity: canClaimBox ? 1 : 0.6,
          pointerEvents: 'auto'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
        }}
      >
        <Gift 
          size={32} 
          color="white" 
          style={{ 
            filter: 'drop-shadow(0 0 2px white)', 
            pointerEvents: 'none' 
          }} 
        />
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