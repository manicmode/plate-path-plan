
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
      } else if (tileId === 'exercise-hub') {
        setNavigationInProgress(true);
        navigate('/exercise-hub', { state: { from: '/explore' } });
        setTimeout(() => setNavigationInProgress(false), 300);
      } else if (tileId === 'influencers') {
        setIsComingSoonOpen(true);
      } else if (tileId === 'habit-central') {
        setNavigationInProgress(true);
        navigate('/habit');
        setTimeout(() => setNavigationInProgress(false), 300);
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
      id: 'health-check',
      title: 'Health Scan',
      emoji: '❤️',
      color: 'from-red-300 to-rose-600',
      shadowColor: 'shadow-red-500/20',
    },
    {
      id: 'game-challenge',
      title: 'Game & Challenge',
      emoji: '🏆',
      color: 'from-yellow-300 to-orange-600',
      shadowColor: 'shadow-yellow-500/20',
    },
    {
      id: 'supplement-hub',
      title: 'Supplement Hub',
      emoji: '🧪',
      color: 'from-purple-300 to-pink-600',
      shadowColor: 'shadow-purple-500/20',
    },
    {
      id: 'exercise-hub',
      title: 'Exercise & Recovery',
      emoji: '💪',
      color: 'from-blue-500 via-blue-400 to-blue-600',
      shadowColor: 'shadow-blue-500/30',
    },
    {
      id: 'influencers',
      title: 'Influencer Hub',
      emoji: '⭐️',
      color: 'from-blue-600 via-cyan-400 to-cyan-600',
      shadowColor: 'shadow-cyan-500/30',
    },
    {
      id: 'habit-central',
      title: 'Habit Central',
      emoji: '⏳',
      color: 'from-green-500 via-emerald-400 to-green-600',
      shadowColor: 'shadow-green-500/30',
    },
  ];

  const profileRowTiles = [
    {
      id: 'my-reports',
      title: 'My Reports',
      emoji: '📊',
      color: 'from-gray-600 via-gray-400 to-gray-600',
      shadowColor: 'shadow-gray-500/30',
    },
    {
      id: 'profile',
      title: 'Profile',
      emoji: '👤',
      color: 'from-gray-600 via-gray-400 to-gray-600',
      shadowColor: 'shadow-gray-500/30',
    },
  ];

  // Safety check for mobile detection
  const safeIsMobile = isMobile ?? false;

  return (
    <div className="flex flex-col p-4 overflow-hidden relative md:pb-[120px]">
      {/* Main 2x3 Grid with simplified styling */}
      <div className="grid grid-cols-2 grid-rows-3 gap-4 mb-4">
        {mainTiles.map((tile) => {
          return (
            <Button
              data-testid={`tile-${tile.id}`}
              onClick={() => handleTileClick(tile.id)}
              disabled={navigationInProgress}
              variant="ghost"
            className={`
                group relative h-full min-h-[180px] p-6 rounded-2xl 
                transition-all duration-500 ease-out
                bg-gradient-to-br ${tile.color} 
                hover:scale-105 active:scale-95 active:rotate-1
                shadow-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.2)] shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] ${tile.shadowColor} hover:shadow-2xl
                border-0 text-white hover:text-white
                flex flex-col items-center justify-center space-y-5
                ${navigationInProgress ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {/* Emoji Icon */}
              <div className={`${safeIsMobile ? 'text-[3.5rem]' : 'text-[4rem]'} 
                group-hover:animate-bounce group-hover:scale-110 transition-transform duration-500 ease-out
                filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]`}>
                {tile.emoji}
              </div>
              {/* Title */}
              <span className={`${safeIsMobile ? 'text-sm' : 'text-base'} 
                font-bold text-center leading-tight text-white
                drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-shadow-[0_1px_2px_rgba(0,0,0,0.6)]`}>
                {tile.title}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Bottom Row - My Reports and Profile Tabs */}
      <div className="w-full mb-2 relative z-30 grid grid-cols-2 gap-4">
        {/* My Reports Tab */}
        <Button
          data-testid="tile-my-reports"
          onClick={() => handleTileClick('my-reports')}
          disabled={navigationInProgress}
          variant="ghost"
          className={`
            group relative h-16 p-3 rounded-2xl 
            transition-all duration-500 ease-out
            bg-gradient-to-br from-slate-300 to-slate-600 
            hover:scale-105 active:scale-95 active:rotate-1
            shadow-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.2)] shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] shadow-slate-500/20 hover:shadow-2xl
            border-0 text-white hover:text-white
            flex items-center justify-center
            ${navigationInProgress ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="flex items-center justify-center w-full">
            {/* My Reports Icon */}
            <div className={`mr-2 ${safeIsMobile ? 'text-xl' : 'text-2xl'} 
              group-hover:animate-bounce group-hover:scale-110 transition-transform duration-500 ease-out
              filter drop-shadow-lg`}>
              📄
            </div>
            {/* My Reports Text */}
            <span className={`text-center ${safeIsMobile ? 'text-sm' : 'text-base'} 
              font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]`}>
              Reports
            </span>
          </div>
        </Button>

        {/* Profile Tab */}
        <Button
          data-testid="tile-profile"
          onClick={() => handleTileClick('profile')}
          disabled={navigationInProgress}
          variant="ghost"
          className={`
            group relative h-16 p-3 rounded-2xl 
            transition-all duration-500 ease-out
            bg-gradient-to-br from-slate-300 to-slate-600 
            hover:scale-105 active:scale-95 active:rotate-1
            shadow-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.2)] shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] shadow-slate-500/20 hover:shadow-2xl
            border-0 text-white hover:text-white
            flex items-center justify-center
            ${navigationInProgress ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="flex items-center justify-center w-full">
            {/* Profile Icon */}
            <div className={`mr-2 ${safeIsMobile ? 'text-xl' : 'text-2xl'} 
              group-hover:animate-bounce group-hover:scale-110 transition-transform duration-500 ease-out
              filter drop-shadow-lg`}>
              👤
            </div>
            {/* Profile Text */}
            <span className={`text-center ${safeIsMobile ? 'text-sm' : 'text-base'} 
              font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]`}>
              Profile
            </span>
          </div>
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
