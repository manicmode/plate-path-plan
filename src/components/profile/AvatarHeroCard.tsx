import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, Wand2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { CaricatureModal } from './CaricatureModal';
import { cn } from '@/lib/utils';

interface AvatarHeroCardProps {
  user: {
    id?: string;
    user_id?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar_url?: string;
    caricature_generation_count?: number;
    avatar_variant_1?: string;
    avatar_variant_2?: string;
    avatar_variant_3?: string;
    selected_avatar_variant?: number;
    caricature_history?: Array<{
      timestamp: string;
      variants: string[];
      generated_at: string;
    }>;
    last_caricature_generation?: string;
  } | null;
}

export const AvatarHeroCard = ({ user }: AvatarHeroCardProps) => {
  const isMobile = useIsMobile();
  const [caricatureModalOpen, setCaricatureModalOpen] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(user?.avatar_url);
  const [generationCount, setGenerationCount] = useState(user?.caricature_generation_count || 0);
  
  const avatarVariants = {
    variant_1: user?.avatar_variant_1,
    variant_2: user?.avatar_variant_2,
    variant_3: user?.avatar_variant_3,
    selected_avatar_variant: user?.selected_avatar_variant
  };

  // Calculate cooldown
  const calculateCooldown = () => {
    if (!user?.last_caricature_generation) return null;
    
    const lastGen = new Date(user.last_caricature_generation);
    const now = new Date();
    const thirtyDaysLater = new Date(lastGen.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    if (now < thirtyDaysLater) {
      const daysLeft = Math.ceil((thirtyDaysLater.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        daysLeft,
        nextAvailable: thirtyDaysLater.toLocaleDateString()
      };
    }
    return null;
  };

  const cooldown = calculateCooldown();

  const displayName = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}`
    : user?.name || user?.email || 'User';

  const handleAvatarUpdate = (url: string) => {
    setCurrentAvatarUrl(url);
  };

  const handleGenerationCountUpdate = (count: number) => {
    setGenerationCount(count);
  };

  return (
    <>
      {/* Full-Width Hero Avatar Card */}
      <div className={cn(
        "relative w-full max-w-4xl mx-auto overflow-hidden rounded-3xl",
        "bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10",
        "dark:from-purple-600/20 dark:via-pink-600/20 dark:to-orange-600/20",
        "border border-gradient-to-r from-purple-200/50 to-pink-200/50 dark:from-purple-700/50 dark:to-pink-700/50",
        "shadow-2xl hover:shadow-purple-500/25 dark:hover:shadow-purple-400/25",
        "transition-all duration-500",
        "animate-fade-in",
        isMobile ? "mx-4 p-6 mb-4" : "mx-6 p-8 mb-6"
      )}>
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse" />
          <div className="absolute top-12 right-8 w-4 h-4 rounded-full bg-gradient-to-r from-pink-400 to-orange-400 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-8 left-12 w-6 h-6 rounded-full bg-gradient-to-r from-orange-400 to-purple-400 animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-4 right-4 w-3 h-3 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Shimmer Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" style={{ animationDuration: '3s' }} />

        {/* Content */}
        <div className="relative z-10 text-center space-y-6">
          {/* Magical Heading */}
          <div className="space-y-2">
            <h1 className={cn(
              "font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent",
              "drop-shadow-sm",
              isMobile ? "text-2xl" : "text-3xl"
            )}>
              ✨ My Magical Avatar
            </h1>
            <p className={cn(
              "text-muted-foreground font-medium",
              isMobile ? "text-sm" : "text-base"
            )}>
              This is how the world sees you in Voyage 🌟
            </p>
          </div>

          {/* Avatar Display */}
          <div className="flex justify-center">
            <div className="relative group">
              {/* Glow Ring */}
              <div className={cn(
                "absolute inset-0 rounded-full",
                "bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400",
                "opacity-20 group-hover:opacity-40 transition-opacity duration-300",
                "blur-md animate-pulse",
                isMobile ? "p-2" : "p-3"
              )} />
              
              {/* Avatar Container */}
              <div className="relative">
                <Avatar className={cn(
                  "ring-4 ring-white/50 dark:ring-gray-800/50",
                  "shadow-2xl group-hover:scale-105 transition-all duration-500",
                  "border-4 border-gradient-to-r from-purple-300 to-pink-300",
                  isMobile ? "w-32 h-32" : "w-40 h-40"
                )}>
                  {currentAvatarUrl ? (
                    <AvatarImage 
                      src={currentAvatarUrl} 
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback className={cn(
                      "gradient-primary text-white font-bold",
                      isMobile ? "text-4xl" : "text-5xl"
                    )}>
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                {/* Floating Sparkles Badge */}
                {currentAvatarUrl && (
                  <div className={cn(
                    "absolute bg-gradient-to-r from-yellow-400 to-orange-400",
                    "rounded-full flex items-center justify-center",
                    "animate-bounce shadow-lg",
                    isMobile ? "-top-2 -right-2 w-8 h-8" : "-top-3 -right-3 w-10 h-10"
                  )}>
                    <Sparkles className={cn("text-white", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                  </div>
                )}

                {/* Animated Particles */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-1/4 w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
                  <div className="absolute top-1/4 right-0 w-1 h-1 bg-pink-400 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
                  <div className="absolute bottom-1/4 left-0 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '2s' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="space-y-3">
            {cooldown ? (
              <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300">
                <Clock className="h-3 w-3 mr-1" />
                Next Gen in {cooldown.daysLeft} Days ⏳
              </Badge>
            ) : (
              <p className={cn(
                "font-semibold text-green-600 dark:text-green-400",
                isMobile ? "text-sm" : "text-base"
              )}>
                ✨ Ready to generate new avatars!
              </p>
            )}
            
            {user?.caricature_history && user.caricature_history.length > 0 && (
              <p className={cn(
                "text-muted-foreground",
                isMobile ? "text-xs" : "text-sm"
              )}>
                {user.caricature_history.length} generation{user.caricature_history.length !== 1 ? 's' : ''} • {user.caricature_history.reduce((total, batch) => total + batch.variants.length, 0)} magical avatars created
              </p>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              onClick={() => setCaricatureModalOpen(true)}
              className={cn(
                "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500",
                "hover:from-purple-600 hover:via-pink-600 hover:to-orange-600",
                "text-white font-bold rounded-2xl",
                "shadow-lg hover:shadow-xl",
                "active:scale-95 transition-all duration-200",
                "border-0",
                isMobile ? "w-full h-12 text-base" : "w-auto h-14 text-lg px-8"
              )}
            >
              <Wand2 className={cn(isMobile ? "h-4 w-4 mr-2" : "h-5 w-5 mr-3")} />
              🎭 Open Avatar Studio
            </Button>
          </div>
        </div>
      </div>

      {/* Caricature Modal */}
      <CaricatureModal
        isOpen={caricatureModalOpen}
        onClose={() => setCaricatureModalOpen(false)}
        userId={user?.user_id || user?.id || ''}
        currentAvatarUrl={currentAvatarUrl}
        onAvatarUpdate={handleAvatarUpdate}
        generationCount={generationCount}
        onGenerationCountUpdate={handleGenerationCountUpdate}
        avatarVariants={avatarVariants}
        caricatureHistory={user?.caricature_history}
        lastCaricatureGeneration={user?.last_caricature_generation}
      />
    </>
  );
};