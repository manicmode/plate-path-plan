import React, { useState, useEffect } from 'react';
import { Gift, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRewards, type Reward } from '@/contexts/RewardsContext';
import { useAuth } from '@/contexts/auth';
import { useLocation } from 'react-router-dom';
import { RewardModal } from './RewardModal';
import { cn } from '@/lib/utils';

interface MysteryBoxProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

const KEY = 'giftFab:dismissedAt';
const HIDE_MS = 24 * 60 * 60 * 1000;
const HIDE_ROUTES = ['/auth', '/onboarding', '/reset-password', '/magic-link', '/verify'];

function isDismissed() {
  try {
    const ts = Number(localStorage.getItem(KEY) || 0);
    return ts && Date.now() - ts < HIDE_MS;
  } catch {
    return false;
  }
}

function dismiss() {
  try { 
    localStorage.setItem(KEY, String(Date.now())); 
  } catch {}
}

export function MysteryBox({ position = 'top-right', className }: MysteryBoxProps) {
  // ✅ ALL HOOKS FIRST - No early returns before hooks
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const { canClaimBox, claimMysteryBox, timeUntilNextBox } = useRewards();
  const [showModal, setShowModal] = useState(false);
  const [claimedReward, setClaimedReward] = useState<Reward | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [floatingPosition, setFloatingPosition] = useState({
    bottom: 120,
    right: 80
  });

  // Check if should be hidden
  const onAuthScreen = HIDE_ROUTES.some(p => pathname.startsWith(p));
  
  // Early return guards
  if (onAuthScreen || isDismissed() || !isAuthenticated) {
    return null;
  }

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
    
    if (!canClaimBox) {
      // Show feedback when clicked during cooldown
      return;
    }
    
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
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Don't render anything if box should be hidden
  if (boxState === 'hidden') {
    return null;
  }

  // 🎯 RENDER MYSTERY BOX
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            data-testid="gift-fab"
            aria-label="Open rewards"
            onClick={handleBoxClick}
            className="fixed flex items-center justify-center w-[72px] h-[72px] rounded-full cursor-pointer border-0 transition-all duration-200 ease-in-out"
            style={{
              bottom: `${floatingPosition.bottom}px`,
              right: `${floatingPosition.right}px`,
              background: 'linear-gradient(135deg, #FFD700, #FF8C00, #FF4500, #DC143C)',
              boxShadow: '0 0 30px 8px rgba(255, 215, 0, 0.6), 0 0 60px 12px rgba(255, 140, 0, 0.4), 0 0 90px 16px rgba(255, 69, 0, 0.2)',
              zIndex: 2147483646,
              animation: 'gift-pulse 1.5s ease-in-out infinite',
              transition: 'bottom 0.8s ease, right 0.8s ease, transform 0.2s ease, box-shadow 0.3s ease',
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
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-card border shadow-lg">
          <p className="text-sm font-medium">🎁 Mystery Box Ready!</p>
        </TooltipContent>
      </Tooltip>

      {/* Reward Modal */}
      <RewardModal
        open={showModal}
        onOpenChange={(v) => {
          setShowModal(v);
          if (!v) dismiss(); // hide for 24h after close
        }}
        reward={claimedReward}
      />
    </TooltipProvider>
  );
}