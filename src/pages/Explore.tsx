import { useNavigate } from 'react-router-dom';
import { FlaskConical, Trophy, HeartPulse, Star, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

const Explore = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const tiles = [
    {
      id: 'supplement-hub',
      title: 'Supplement Hub',
      icon: FlaskConical,
      color: 'from-purple-500 via-purple-400 to-pink-500',
      shadowColor: 'shadow-purple-500/30',
      glowColor: 'hover:shadow-purple-400/40',
    },
    {
      id: 'game-challenge',
      title: 'Game & Challenge',
      icon: Trophy,
      color: 'from-yellow-500 via-orange-400 to-orange-500',
      shadowColor: 'shadow-yellow-500/30',
      glowColor: 'hover:shadow-yellow-400/40',
    },
    {
      id: 'health-check',
      title: 'Health Check',
      icon: HeartPulse,
      color: 'from-red-500 via-rose-400 to-rose-500',
      shadowColor: 'shadow-red-500/30',
      glowColor: 'hover:shadow-red-400/40',
    },
    {
      id: 'influencers',
      title: 'Influencers',
      icon: Star,
      color: 'from-blue-500 via-cyan-400 to-cyan-500',
      shadowColor: 'shadow-blue-500/30',
      glowColor: 'hover:shadow-cyan-400/40',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col p-4 pb-40">
      {/* Main 2x2 Grid - Takes most of the screen */}
      <div className="flex-1 grid grid-cols-2 gap-6 mb-8">
        {tiles.map((tile) => {
          const IconComponent = tile.icon;
          return (
            <Button
              key={tile.id}
              variant="ghost"
              className={`
                group relative h-full min-h-[160px] p-8 rounded-3xl 
                transition-all duration-500 ease-out
                bg-gradient-to-br ${tile.color} 
                hover:scale-110 active:scale-95 active:rotate-1
                shadow-2xl ${tile.shadowColor} ${tile.glowColor} hover:shadow-2xl
                border-0 text-white hover:text-white
                flex flex-col items-center justify-center space-y-4
                backdrop-blur-sm overflow-hidden
                before:absolute before:inset-0 before:bg-gradient-to-br 
                before:from-white/10 before:to-transparent before:opacity-0 
                hover:before:opacity-100 before:transition-opacity before:duration-300
              `}
            >
              <IconComponent className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} 
                group-hover:animate-pulse group-hover:scale-110 
                transition-all duration-300 drop-shadow-lg z-10 relative`} />
              <span className={`${isMobile ? 'text-base' : 'text-lg'} 
                font-black text-center leading-tight z-10 relative
                drop-shadow-md tracking-wide rounded-full`}>
                {tile.title}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Profile Tile - Full Width at Bottom with better spacing */}
      <div className="mt-auto mb-6">
        <Button
          onClick={handleProfileClick}
          variant="ghost"
          className="
            w-full h-20 px-8 rounded-3xl transition-all duration-300
            bg-gradient-to-r from-slate-300 via-gray-300 to-slate-400 
            dark:from-slate-600 dark:via-gray-600 dark:to-slate-700
            hover:from-slate-400 hover:via-gray-400 hover:to-slate-500 
            dark:hover:from-slate-500 dark:hover:via-gray-500 dark:hover:to-slate-600
            hover:scale-[1.03] active:scale-[0.97]
            shadow-xl shadow-slate-400/30 hover:shadow-2xl hover:shadow-slate-400/40
            border-2 border-slate-400/20 hover:border-slate-400/30
            text-slate-700 dark:text-slate-200 hover:text-slate-800 dark:hover:text-white
            flex items-center justify-center space-x-4
            backdrop-blur-sm
          "
        >
          <UserRound className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} drop-shadow-sm`} />
          <span className={`${isMobile ? 'text-lg' : 'text-xl'} font-black tracking-wide`}>
            Profile
          </span>
        </Button>
      </div>
    </div>
  );
};

export default Explore;