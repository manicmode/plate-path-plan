import React, { useState, useEffect } from 'react';
import { Gift, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

  // 🎯 NEW LOGIC: Show box based on availability state
  const shouldShowBox = () => {
    if (canClaimBox) return 'ready'; // Show glowing, animated box
    
    // Show dimmed box only in the last 24 hours before it becomes available
    const oneDayInMs = 24 * 60 * 60 * 1000;
    if (timeUntilNextBox > 0 && timeUntilNextBox <= oneDayInMs) {
      return 'countdown'; // Show dimmed box with countdown
    }
    
    return 'hidden'; // Don't show at all
  };

  const boxState = shouldShowBox();

  // ✨ MOVEMENT: Only animate when box is ready to be claimed
  useEffect(() => {
    if (typeof window === 'undefined' || boxState !== 'ready') return;
    
    const generateNewPosition = () => {
      const newPosition = {
        bottom: Math.floor(Math.random() * 200) + 120, // Min: 120px (above nav), Max: 320px
        right: Math.floor(Math.random() * 120) + 20     // Min: 20px, Max: 140px (stays on screen)
      };
      
      setFloatingPosition(newPosition);
    };

    // Generate new position immediately
    generateNewPosition();
    
    // Continue moving every 3 seconds when ready
    const interval = setInterval(generateNewPosition, 3000);

    return () => clearInterval(interval);
  }, [boxState]); // Re-run when box state changes


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

  const formatTimeLeft = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // 🚫 EARLY RETURN: Don't render anything if box should be hidden
  if (boxState === 'hidden') {
    return null;
  }

  // 🎯 RENDER MYSTERY BOX
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            id="gift-box"
            onClick={handleBoxClick}
            style={{
              position: 'fixed',
              bottom: boxState === 'countdown' ? '120px' : `${floatingPosition.bottom}px`, // Fixed position when in countdown
              right: boxState === 'countdown' ? '80px' : `${floatingPosition.right}px`,   // Fixed position when in countdown
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: boxState === 'ready' 
                ? 'linear-gradient(135deg, #FFD700, #FF8C00, #FF4500, #DC143C)'
                : 'linear-gradient(135deg, #4A5568, #718096)',
              boxShadow: boxState === 'ready'
                ? '0 0 30px 8px rgba(255, 215, 0, 0.6), 0 0 60px 12px rgba(255, 140, 0, 0.4), 0 0 90px 16px rgba(255, 69, 0, 0.2)'
                : '0 0 10px 3px rgba(113, 128, 150, 0.2)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 999999,
              cursor: boxState === 'ready' ? 'pointer' : 'not-allowed',
              animation: boxState === 'ready' ? 'gift-pulse 1.5s ease-in-out infinite' : 'pulse 2s ease-in-out infinite',
              transition: boxState === 'ready' ? 'bottom 0.8s ease, right 0.8s ease, transform 0.2s ease, box-shadow 0.3s ease' : 'transform 0.2s ease',
              opacity: boxState === 'ready' ? 1 : 0.4,
              pointerEvents: 'auto',
              border: boxState === 'ready' ? '3px solid rgba(255, 255, 255, 0.3)' : '2px solid rgba(255, 255, 255, 0.1)'
            }}
            onMouseEnter={(e) => {
              if (boxState === 'ready') {
                e.currentTarget.style.transform = 'scale(1.15) translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 0 40px 12px rgba(255, 215, 0, 0.8), 0 0 80px 16px rgba(255, 140, 0, 0.6), 0 0 120px 20px rgba(255, 69, 0, 0.3)';
              } else {
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              if (boxState === 'ready') {
                e.currentTarget.style.boxShadow = '0 0 30px 8px rgba(255, 215, 0, 0.6), 0 0 60px 12px rgba(255, 140, 0, 0.4), 0 0 90px 16px rgba(255, 69, 0, 0.2)';
              }
            }}
          >
            {boxState === 'ready' ? (
              <Gift 
                size={36} 
                color="white" 
                style={{ 
                  filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))',
                  pointerEvents: 'none' 
                }} 
              />
            ) : (
              <Clock 
                size={32} 
                color="white" 
                style={{ 
                  filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.5))',
                  pointerEvents: 'none' 
                }} 
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-card border shadow-lg">
          {boxState === 'ready' ? (
            <p className="text-sm font-medium">🎁 Mystery Box Ready!</p>
          ) : (
            <p className="text-sm">🎁 Ready in {formatTimeLeft(timeUntilNextBox)}</p>
          )}
        </TooltipContent>
      </Tooltip>

      {/* Reward Modal */}
      <RewardModal
        open={showModal}
        onOpenChange={setShowModal}
        reward={claimedReward}
      />
    </TooltipProvider>
  );
}