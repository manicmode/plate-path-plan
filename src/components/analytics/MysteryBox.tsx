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

  // 🎯 SMART FLOATING LOGIC: Only show when ready to be opened
  const shouldShowBox = () => {
    if (canClaimBox) return 'ready'; // Show glowing, animated floating box
    return 'hidden'; // Hide completely during cooldown
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
      // Show feedback when clicked during cooldown
      if (timeUntilNextBox > 0) {
        const timeLeft = formatTimeLeft(timeUntilNextBox);
        console.log(`⏰ Next box available in: ${timeLeft}`);
      }
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
      } else {
        console.log('⚠️ No reward received - this should not happen');
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
              bottom: `${floatingPosition.bottom}px`,
              right: `${floatingPosition.right}px`,
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFD700, #FF8C00, #FF4500, #DC143C)',
              boxShadow: '0 0 30px 8px rgba(255, 215, 0, 0.6), 0 0 60px 12px rgba(255, 140, 0, 0.4), 0 0 90px 16px rgba(255, 69, 0, 0.2)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 999999,
              cursor: 'pointer',
              animation: 'gift-pulse 1.5s ease-in-out infinite',
              transition: 'bottom 0.8s ease, right 0.8s ease, transform 0.2s ease, box-shadow 0.3s ease',
              opacity: 1,
              pointerEvents: 'auto',
              border: '3px solid rgba(255, 255, 255, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.15) translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 0 40px 12px rgba(255, 215, 0, 0.8), 0 0 80px 16px rgba(255, 140, 0, 0.6), 0 0 120px 20px rgba(255, 69, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 30px 8px rgba(255, 215, 0, 0.6), 0 0 60px 12px rgba(255, 140, 0, 0.4), 0 0 90px 16px rgba(255, 69, 0, 0.2)';
            }}
          >
            <Gift 
              size={36} 
              color="white" 
              style={{ 
                filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))',
                pointerEvents: 'none' 
              }} 
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-card border shadow-lg">
          <p className="text-sm font-medium">🎁 Mystery Box Ready!</p>
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