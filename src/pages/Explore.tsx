
import { useNavigate } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useState } from 'react';
import { HealthCheckModal } from '@/components/health-check/HealthCheckModal';
import { ComingSoonPopup } from '@/components/ComingSoonPopup';

const Explore = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
  
  // Use the scroll-to-top hook
  useScrollToTop();

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleTileClick = (tileId: string) => {
    if (tileId === 'supplement-hub') {
      navigate('/supplement-hub');
    } else if (tileId === 'health-check') {
      setIsHealthCheckOpen(true);
    } else if (tileId === 'game-challenge') {
      navigate('/game-and-challenge');
    } else if (tileId === 'influencers') {
      setIsComingSoonOpen(true);
    } else if (tileId === 'my-reports') {
      navigate('/reports');
    } else if (tileId === 'profile') {
      handleProfileClick();
    }
    // Add other tile navigation here as needed
  };

  const tiles = [
    {
      id: 'health-check',
      title: 'Health Check',
      emoji: '❤️',
      color: 'from-red-500 via-rose-400 to-rose-500',
      shadowColor: 'shadow-red-500/30',
      glowColor: 'hover:shadow-red-400/50',
      animatedGradient: 'bg-gradient-to-br from-red-400 via-rose-500 to-pink-500',
    },
    {
      id: 'game-challenge',
      title: 'Game & Challenge',
      emoji: '🏆',
      color: 'from-yellow-500 via-orange-400 to-orange-500',
      shadowColor: 'shadow-yellow-500/30',
      glowColor: 'hover:shadow-yellow-400/50',
      animatedGradient: 'bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600',
    },
    {
      id: 'supplement-hub',
      title: 'Supplement Hub',
      emoji: '🧪',
      color: 'from-purple-500 via-purple-400 to-pink-500',
      shadowColor: 'shadow-purple-500/30',
      glowColor: 'hover:shadow-purple-400/50',
      animatedGradient: 'bg-gradient-to-br from-purple-400 via-purple-500 to-pink-500',
    },
    {
      id: 'influencers',
      title: 'Influencers',
      emoji: '⭐️',
      color: 'from-blue-500 via-cyan-400 to-cyan-500',
      shadowColor: 'shadow-blue-500/30',
      glowColor: 'hover:shadow-cyan-400/50',
      animatedGradient: 'bg-gradient-to-br from-blue-400 via-cyan-500 to-teal-500',
    },
    {
      id: 'my-reports',
      title: 'My Reports',
      emoji: '📄',
      color: 'from-emerald-600 via-emerald-400 to-teal-400',
      shadowColor: 'shadow-emerald-500/30',
      glowColor: 'hover:shadow-emerald-400/50',
      animatedGradient: 'bg-gradient-to-br from-emerald-600 via-emerald-400 to-teal-400',
    },
    {
      id: 'profile',
      title: 'Profile',
      emoji: '👤',
      color: 'from-slate-500 via-slate-400 to-slate-500',
      shadowColor: 'shadow-slate-500/30',
      glowColor: 'hover:shadow-slate-400/50',
      animatedGradient: 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col p-4 pb-16">
      {/* Main 2x3 Grid - Natural sizing instead of flex-1 */}
      <div className="grid grid-cols-2 grid-rows-3 gap-4 mb-6">
        {tiles.map((tile) => {
          return (
            <Button
              key={tile.id}
              onClick={() => handleTileClick(tile.id)}
              variant="ghost"
              className={`
                group relative h-full min-h-[90px] p-6 rounded-3xl 
                transition-all duration-500 ease-out
                bg-gradient-to-br ${tile.color} 
                hover:scale-105 active:scale-95 active:rotate-1
                shadow-2xl ${tile.shadowColor} ${tile.glowColor} hover:shadow-3xl
                border-0 text-white hover:text-white
                flex flex-col items-center justify-center space-y-3
                backdrop-blur-sm overflow-hidden
                before:absolute before:inset-0 before:bg-gradient-to-br 
                before:from-white/20 before:to-transparent before:opacity-0 
                hover:before:opacity-100 before:transition-opacity before:duration-300
                after:absolute after:inset-0 after:bg-gradient-to-t
                after:from-black/5 after:to-transparent after:opacity-100
              `}
            >
              {/* Large Emoji Icon */}
              <div className={`${isMobile ? 'text-5xl' : 'text-6xl'} 
                group-hover:animate-bounce group-hover:scale-110 
                transition-all duration-300 z-10 relative filter drop-shadow-2xl`}>
                {tile.emoji}
              </div>
              {/* Clean Label */}
              <span className={`${isMobile ? 'text-sm' : 'text-base'} 
                font-black text-center leading-tight text-white z-10 relative
                drop-shadow-2xl tracking-wide`}
                style={{ 
                  textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.4)' 
                }}>
                {tile.title}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Health Check Modal */}
      <HealthCheckModal 
        isOpen={isHealthCheckOpen} 
        onClose={() => setIsHealthCheckOpen(false)} 
      />
      
      {/* Coming Soon Popup */}
      <ComingSoonPopup 
        isOpen={isComingSoonOpen} 
        onClose={() => setIsComingSoonOpen(false)}
        feature="Influencers"
      />
    </div>
  );
};

export default Explore;
