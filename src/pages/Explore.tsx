import { useNavigate } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useState } from 'react';
import { HealthCheckModal } from '@/components/health-check/HealthCheckModal';

const Explore = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);
  
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
    } else if (tileId === 'hall-of-fame') {
      navigate('/hall-of-fame');
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
      id: 'hall-of-fame',
      title: 'Hall of Fame',
      emoji: '🏆',
      color: 'from-yellow-500 via-orange-400 to-orange-500',
      shadowColor: 'shadow-yellow-500/30',
      glowColor: 'hover:shadow-yellow-400/50',
      animatedGradient: 'bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600',
    },
    {
      id: 'game-challenge',
      title: 'Game & Challenge',
      emoji: '🎮',
      color: 'from-green-500 via-emerald-400 to-teal-500',
      shadowColor: 'shadow-green-500/30',
      glowColor: 'hover:shadow-emerald-400/50',
      animatedGradient: 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600',
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
  ];

  return (
    <div className="min-h-screen flex flex-col p-4 pb-32">
      {/* Main 2x2 Grid - Takes most of the screen */}
      <div className="flex-1 grid grid-cols-2 gap-4 mb-6">
        {tiles.map((tile) => {
          return (
            <Button
              key={tile.id}
              onClick={() => handleTileClick(tile.id)}
              variant="ghost"
              className={`
                group relative h-full min-h-[180px] p-6 rounded-3xl 
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

      {/* Profile Tile - Full Width at Bottom with theme-adaptive colors and proper spacing */}
      <div className="mt-auto mb-24">
        <Button
          onClick={handleProfileClick}
          variant="ghost"
          className="
            w-full h-20 px-8 rounded-3xl transition-all duration-300
            bg-gradient-to-r from-slate-200/90 via-slate-300/90 to-slate-400/90 
            dark:from-slate-400/90 dark:via-slate-500/90 dark:to-slate-600/90
            hover:from-slate-100/95 hover:via-slate-200/95 hover:to-slate-300/95 
            dark:hover:from-slate-300/95 dark:hover:via-slate-400/95 dark:hover:to-slate-500/95
            hover:scale-[1.02] active:scale-[0.98]
            shadow-2xl shadow-slate-900/30 hover:shadow-3xl hover:shadow-slate-900/40
            dark:shadow-slate-900/30 dark:hover:shadow-slate-900/40
            border-2 border-slate-400/40 hover:border-slate-300/50
            dark:border-slate-400/50 dark:hover:border-slate-300/60
            text-slate-800 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white
            flex items-center justify-center
            backdrop-blur-md relative overflow-hidden
            before:absolute before:inset-0 before:bg-gradient-to-r 
            before:from-white/10 before:via-transparent before:to-white/10
            before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
          "
        >
          <div className="flex items-center space-x-4 transform -translate-x-4">
            <div className="text-2xl">👤</div>
            <span className={`${isMobile ? 'text-lg' : 'text-xl'} font-black tracking-wide drop-shadow-sm`}>
              Profile
            </span>
          </div>
        </Button>
      </div>

      {/* Health Check Modal */}
      <HealthCheckModal 
        isOpen={isHealthCheckOpen} 
        onClose={() => setIsHealthCheckOpen(false)} 
      />
    </div>
  );
};

export default Explore;