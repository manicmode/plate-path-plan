import { useNavigate } from 'react-router-dom';
import { Pill, Trophy, Heart, Users, User } from 'lucide-react';
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
      icon: Pill,
      color: 'from-purple-500 to-pink-500',
      shadowColor: 'shadow-purple-500/25',
    },
    {
      id: 'game-challenge',
      title: 'Game & Challenge',
      icon: Trophy,
      color: 'from-yellow-500 to-orange-500',
      shadowColor: 'shadow-yellow-500/25',
    },
    {
      id: 'health-check',
      title: 'Health Check',
      icon: Heart,
      color: 'from-red-500 to-rose-500',
      shadowColor: 'shadow-red-500/25',
    },
    {
      id: 'influencers',
      title: 'Influencers',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      shadowColor: 'shadow-blue-500/25',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col p-4 pb-32">
      {/* Main 2x2 Grid - Takes 80% of screen */}
      <div className="flex-1 grid grid-cols-2 gap-4 mb-4">
        {tiles.map((tile) => {
          const IconComponent = tile.icon;
          return (
            <Button
              key={tile.id}
              variant="ghost"
              className={`
                group h-full min-h-[140px] p-6 rounded-3xl transition-all duration-300
                bg-gradient-to-br ${tile.color} 
                hover:scale-105 active:scale-95
                shadow-lg ${tile.shadowColor} hover:shadow-xl
                border-0 text-white hover:text-white
                flex flex-col items-center justify-center space-y-3
              `}
            >
              <IconComponent className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} group-hover:animate-pulse`} />
              <span className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-center leading-tight`}>
                {tile.title}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Profile Tile - Full Width at Bottom */}
      <Button
        onClick={handleProfileClick}
        variant="ghost"
        className="
          w-full h-16 px-6 rounded-3xl transition-all duration-300
          bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700
          hover:from-gray-400 hover:to-gray-500 dark:hover:from-gray-500 dark:hover:to-gray-600
          hover:scale-[1.02] active:scale-[0.98]
          shadow-lg shadow-gray-400/25 hover:shadow-xl
          border-0 text-gray-700 dark:text-gray-200 hover:text-gray-800 dark:hover:text-white
          flex items-center justify-center space-x-3
        "
      >
        <User className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
        <span className={`${isMobile ? 'text-base' : 'text-lg'} font-bold`}>
          Profile
        </span>
      </Button>
    </div>
  );
};

export default Explore;