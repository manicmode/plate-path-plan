
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useState, useCallback } from 'react';
import { HealthCheckModal } from '@/components/health-check/HealthCheckModal';
import { ComingSoonPopup } from '@/components/ComingSoonPopup';

const Explore = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
  const [navigationInProgress, setNavigationInProgress] = useState(false);
  
  // Use the optimized scroll-to-top hook
  useScrollToTop();

  const handleProfileClick = useCallback(() => {
    if (navigationInProgress) return;
    setNavigationInProgress(true);
    navigate('/profile');
    setTimeout(() => setNavigationInProgress(false), 300);
  }, [navigate, navigationInProgress]);

  const handleTileClick = useCallback((tileId: string) => {
    if (navigationInProgress) return;
    
    try {
      if (tileId === 'supplement-hub') {
        setNavigationInProgress(true);
        navigate('/supplement-hub');
        setTimeout(() => setNavigationInProgress(false), 300);
      } else if (tileId === 'health-check') {
        setIsHealthCheckOpen(true);
      } else if (tileId === 'game-challenge') {
        setNavigationInProgress(true);
        navigate('/game-and-challenge');
        setTimeout(() => setNavigationInProgress(false), 300);
      } else if (tileId === 'influencers' || tileId === 'exercise-hub') {
        setIsComingSoonOpen(true);
      } else if (tileId === 'my-reports') {
        setNavigationInProgress(true);
        navigate('/my-reports');
        setTimeout(() => setNavigationInProgress(false), 300);
      } else if (tileId === 'profile') {
        handleProfileClick();
      }
    } catch (error) {
      console.error('Navigation error:', error);
      setNavigationInProgress(false);
    }
  }, [navigate, navigationInProgress, handleProfileClick]);

  const mainTiles = [
    {
      id: 'exercise-hub',
      title: 'Exercise Hub',
      emoji: '💪',
      color: 'from-blue-500 to-blue-600',
      shadowColor: 'shadow-blue-500/20',
    },
    {
      id: 'game-challenge',
      title: 'Game & Challenge',
      emoji: '🏆',
      color: 'from-yellow-500 to-orange-500',
      shadowColor: 'shadow-yellow-500/20',
    },
    {
      id: 'supplement-hub',
      title: 'Supplement Hub',
      emoji: '🧪',
      color: 'from-purple-500 to-pink-500',
      shadowColor: 'shadow-purple-500/20',
    },
    {
      id: 'influencers',
      title: 'Influencer Hub',
      emoji: '⭐️',
      color: 'from-blue-500 to-cyan-500',
      shadowColor: 'shadow-blue-500/20',
    },
    {
      id: 'my-reports',
      title: 'My Reports',
      emoji: '📄',
      color: 'from-emerald-500 to-teal-500',
      shadowColor: 'shadow-emerald-500/20',
    },
    {
      id: 'health-check',
      title: 'Health Scan',
      emoji: '❤️',
      color: 'from-red-500 to-rose-500',
      shadowColor: 'shadow-red-500/20',
    },
  ];

  // Safety check for mobile detection
  const safeIsMobile = isMobile ?? false;

  return (
    <div className="min-h-screen flex flex-col p-4 pb-24 relative">
      {/* Main 2x3 Grid with simplified styling */}
      <div className="grid grid-cols-2 grid-rows-3 gap-4 mb-6">
        {mainTiles.map((tile) => {
          return (
            <Button
              key={tile.id}
              onClick={() => handleTileClick(tile.id)}
              disabled={navigationInProgress}
              variant="ghost"
              className={`
                group relative h-full min-h-[180px] p-4 rounded-2xl 
                transition-all duration-300 ease-out
                bg-gradient-to-br ${tile.color} 
                hover:scale-105 active:scale-95
                shadow-xl shadow-inner shadow-[inset_0_4px_12px_rgba(255,255,255,0.2)] ${tile.shadowColor} hover:shadow-2xl
                border-0 text-white hover:text-white
                flex flex-col items-center justify-center space-y-2
                ${navigationInProgress ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {/* Emoji Icon */}
              <div className={`${safeIsMobile ? 'text-[2.75rem]' : 'text-[3rem]'} 
                group-active:animate-[bounce_0.5s_ease-in-out] group-active:scale-110 transition-transform duration-200
                filter drop-shadow-lg`}>
                {tile.emoji}
              </div>
              {/* Title */}
              <span className={`${safeIsMobile ? 'text-sm' : 'text-base'} 
                font-bold text-center leading-tight text-white/90
                drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`}>
                {tile.title}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Profile Tab - Simplified and positioned correctly */}
      <div className="w-full mb-16 relative z-30">
        <Button
          onClick={() => handleTileClick('profile')}
          disabled={navigationInProgress}
          variant="ghost"
          className={`
            group relative w-full h-16 p-3 rounded-2xl 
            transition-all duration-300 ease-out
            bg-gradient-to-br from-slate-500 to-slate-600 
            hover:scale-105 active:scale-95
            shadow-xl shadow-inner shadow-[inset_0_4px_12px_rgba(255,255,255,0.2)] shadow-slate-500/20 hover:shadow-2xl
            border-0 text-white hover:text-white
            flex items-center justify-center space-x-3
            ${navigationInProgress ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {/* Profile Icon */}
          <div className={`${safeIsMobile ? 'text-2xl' : 'text-3xl'} 
            group-active:animate-bounce transition-transform duration-200
            filter drop-shadow-lg`}>
            👤
          </div>
          {/* Profile Text */}
          <span className={`${safeIsMobile ? 'text-lg' : 'text-xl'} 
            font-bold text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`}>
            Profile
          </span>
        </Button>
      </div>

      {/* Modals with proper error boundaries */}
      {isHealthCheckOpen && (
        <HealthCheckModal 
          isOpen={isHealthCheckOpen} 
          onClose={() => setIsHealthCheckOpen(false)} 
        />
      )}
      
      {isComingSoonOpen && (
        <ComingSoonPopup 
          isOpen={isComingSoonOpen} 
          onClose={() => setIsComingSoonOpen(false)}
          feature="This Feature"
        />
      )}
    </div>
  );
};

export default Explore;
