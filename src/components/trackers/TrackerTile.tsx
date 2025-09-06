import React, { useRef, useState, useCallback } from 'react';
import { Sparkles, MoreHorizontal } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { TrackerQuickSwap } from './TrackerQuickSwap';
import { TrackerKey } from '@/lib/trackers/trackerRegistry';
import { cn } from '@/lib/utils';

// Feature flags with defaults
const QUICKSWAP_ENABLED = (import.meta.env.VITE_TRACKER_QUICKSWAP ?? 'true') !== 'false';
const LONGPRESS_MS = Number(import.meta.env.VITE_TRACKER_LONGPRESS_MS ?? '1500');
const HAPTIC_ENABLED = (import.meta.env.VITE_TRACKER_LONGPRESS_HAPTIC ?? 'true') !== 'false';
const DIAG_ENABLED = (import.meta.env.VITE_TRACKER_QUICKSWAP_DIAG ?? 'false') === 'true';

interface TrackerConfig {
  name: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  gradient: string;
  emoji: string;
  textColor: string;
  textColorSecondary: string;
  percentage: number;
  shadow: string;
  onClick: () => void;
}

interface TrackerTileProps {
  tracker: TrackerConfig;
  index: 0 | 1 | 2;
  visibleTrackers: TrackerKey[];
  onQuickSwap?: (index: 0 | 1 | 2, newKey: TrackerKey) => void;
  getMotivationalMessage: (percentage: number, type: string) => string;
}

function useLongPress(onLongPress: () => void, ms: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const startLongPress = useCallback((e: React.PointerEvent) => {
    isLongPressRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    if (DIAG_ENABLED) {
      console.debug('[QuickSwap] longpress start', performance.now());
      performance.mark('quickswap_longpress_start');
    }

    timeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
      
      if (DIAG_ENABLED) {
        console.debug('[QuickSwap] longpress triggered', performance.now());
        performance.mark('quickswap_longpress_trigger');
      }
    }, ms);
  }, [onLongPress, ms]);

  const cancelLongPress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (DIAG_ENABLED && !isLongPressRef.current) {
      console.debug('[QuickSwap] longpress cancelled', performance.now());
    }

    isLongPressRef.current = false;
    startPosRef.current = null;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!startPosRef.current) return;

    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 12) {
      cancelLongPress();
    }
  }, [cancelLongPress]);

  return {
    onPointerDown: startLongPress,
    onPointerUp: cancelLongPress,
    onPointerLeave: cancelLongPress,
    onPointerMove: handlePointerMove,
    isLongPress: () => isLongPressRef.current,
  };
}

export function TrackerTile({ 
  tracker, 
  index, 
  visibleTrackers, 
  onQuickSwap,
  getMotivationalMessage 
}: TrackerTileProps) {
  const isMobile = useIsMobile();
  const [isQuickSwapOpen, setIsQuickSwapOpen] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const tileRef = useRef<HTMLDivElement>(null);

  const handleLongPress = useCallback(() => {
    if (!QUICKSWAP_ENABLED || !onQuickSwap) return;

    setIsLongPressing(false);
    setIsQuickSwapOpen(true);

    // Haptic feedback
    if (HAPTIC_ENABLED && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }

    if (DIAG_ENABLED) {
      console.debug('[QuickSwap] longpress open', { index, tracker: tracker.name });
      performance.mark('quickswap_open');
    }
  }, [index, tracker.name, onQuickSwap]);

  const longPressHandlers = useLongPress(handleLongPress, LONGPRESS_MS);

  const handleQuickSwapPick = useCallback((newKey: TrackerKey) => {
    if (onQuickSwap) {
      onQuickSwap(index, newKey);
      
      if (DIAG_ENABLED) {
        console.debug('[QuickSwap] pick', { 
          index, 
          from: tracker.name.toLowerCase(), 
          to: newKey 
        });
        performance.mark('quickswap_pick');
      }
    }
  }, [index, tracker.name, onQuickSwap]);

  const handleTileClick = useCallback((e: React.MouseEvent) => {
    if (longPressHandlers.isLongPress()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    tracker.onClick();
  }, [tracker, longPressHandlers]);

  const handleKeyboardQuickSwap = useCallback(() => {
    if (!QUICKSWAP_ENABLED || !onQuickSwap) return;
    setIsQuickSwapOpen(true);
  }, [onQuickSwap]);

  return (
    <>
      <div 
        ref={tileRef}
        className={cn(
          `border-0 ${isMobile ? 'h-48 p-3' : 'h-52 p-4'} rounded-3xl transition-all duration-500 cursor-pointer group relative overflow-hidden ${tracker.shadow} z-20`,
          isLongPressing ? 'ring-2 ring-primary ring-offset-2' : 'hover:scale-105',
          QUICKSWAP_ENABLED && 'select-none'
        )}
        onClick={handleTileClick}
        {...(QUICKSWAP_ENABLED ? longPressHandlers : {})}
        title={getMotivationalMessage(tracker.percentage, tracker.name)}
        style={{ 
          background: `linear-gradient(135deg, ${tracker.color.replace('from-', '').replace('via-', '').replace('to-', '').split(' ').join(', ')})`,
          position: 'relative',
          zIndex: 20
        }}
        role="button"
        tabIndex={0}
        aria-label={`${tracker.name} tracker. ${tracker.current}${tracker.unit} of ${tracker.target}${tracker.unit}. ${Math.round(tracker.percentage)}% complete.`}
        aria-haspopup={QUICKSWAP_ENABLED ? "menu" : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (e.shiftKey && QUICKSWAP_ENABLED) {
              handleKeyboardQuickSwap();
            } else {
              tracker.onClick();
            }
          }
        }}
      >
        {/* Desktop quick-swap button */}
        {QUICKSWAP_ENABLED && !isMobile && (
          <button
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleKeyboardQuickSwap();
            }}
            aria-label={`Quick-swap tracker for ${tracker.name}`}
            title="Quick-swap tracker"
          >
            <MoreHorizontal className="h-3 w-3 text-white" />
          </button>
        )}

        <div className={`absolute inset-0 bg-gradient-to-br ${tracker.color} backdrop-blur-sm`} style={{ zIndex: 1 }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" style={{ zIndex: 2 }}></div>
        
        <div className="relative flex flex-col items-center justify-center h-full" style={{ zIndex: 10 }}>
          <div className={`relative ${isMobile ? 'w-24 h-24' : 'w-32 h-32'} flex items-center justify-center mb-3`}>
            <svg className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} enhanced-progress-ring`} viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="4" />
              <circle
                cx="60" cy="60" r="50" fill="none" stroke={`url(#${tracker.gradient})`} strokeWidth="6"
                strokeLinecap="round" strokeDasharray={314} strokeDashoffset={314 - (tracker.percentage / 100) * 314}
                className="transition-all duration-2000 ease-out filter drop-shadow-lg"
              />
              <defs>
                <linearGradient id={tracker.gradient} x1="0%" y1="0%" x2="100%" y2="100%">
                  {tracker.name === 'Calories' && (
                    <>
                      <stop offset="0%" stopColor="#FF6B35" />
                      <stop offset="50%" stopColor="#F7931E" />
                      <stop offset="100%" stopColor="#FF4500" />
                    </>
                  )}
                  {tracker.name === 'Protein' && (
                    <>
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="50%" stopColor="#1E40AF" />
                      <stop offset="100%" stopColor="#1E3A8A" />
                    </>
                  )}
                  {tracker.name === 'Carbs' && (
                    <>
                      <stop offset="0%" stopColor="#FBBF24" />
                      <stop offset="50%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#D97706" />
                    </>
                  )}
                  {tracker.name === 'Fat' && (
                    <>
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="50%" stopColor="#059669" />
                      <stop offset="100%" stopColor="#047857" />
                    </>
                  )}
                  {tracker.name === 'Hydration' && (
                    <>
                      <stop offset="0%" stopColor="#00D4FF" />
                      <stop offset="50%" stopColor="#0099CC" />
                      <stop offset="100%" stopColor="#006699" />
                    </>
                  )}
                  {tracker.name === 'Supplements' && (
                    <>
                      <stop offset="0%" stopColor="#DA44BB" />
                      <stop offset="50%" stopColor="#9333EA" />
                      <stop offset="100%" stopColor="#7C3AED" />
                    </>
                  )}
                  {/* Add other tracker gradients as needed */}
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`${isMobile ? 'text-2xl' : 'text-3xl'} mb-1 group-hover:scale-110 transition-transform filter drop-shadow-md`}>{tracker.emoji}</span>
              <span className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold ${tracker.textColor} drop-shadow-lg leading-none`}>
                {Math.round(tracker.percentage)}%
              </span>
              {tracker.percentage >= 100 && <Sparkles className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-white animate-pulse mt-1`} />}
            </div>
          </div>
          <div className="text-center">
            <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold ${tracker.textColor} drop-shadow-md mb-1`}>{tracker.name}</p>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} ${tracker.textColorSecondary} drop-shadow-sm`}>
              {tracker.current.toFixed(0)}{tracker.unit}/{tracker.target}{tracker.unit}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Swap Popover */}
      {QUICKSWAP_ENABLED && (
        <TrackerQuickSwap
          anchorRef={tileRef}
          pressedIndex={index}
          visibleKeys={visibleTrackers}
          onPick={handleQuickSwapPick}
          onClose={() => setIsQuickSwapOpen(false)}
          isOpen={isQuickSwapOpen}
        />
      )}
    </>
  );
}