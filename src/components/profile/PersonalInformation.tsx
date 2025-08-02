
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Settings, Camera, RefreshCw, Sparkles, Clock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { CaricatureModal } from './CaricatureModal';

interface PersonalInformationProps {
  formData: {
    first_name: string;
    last_name: string;
    email: string;
  };
  user: {
    id?: string;
    user_id?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    dietaryGoals?: string[];
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
  isEditing: boolean;
  onFormDataChange: (updates: Partial<any>) => void;
  onEditToggle: () => void;
}

const dietaryGoalOptions = [
  { id: 'weight_loss', label: 'Weight Loss' },
  { id: 'muscle_gain', label: 'Muscle Gain' },
  { id: 'maintenance', label: 'Weight Maintenance' },
  { id: 'endurance', label: 'Endurance Training' },
  { id: 'general_health', label: 'General Health' },
];

export const PersonalInformation = ({ formData, user, isEditing, onFormDataChange, onEditToggle }: PersonalInformationProps) => {
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

  const displayName = formData.first_name && formData.last_name 
    ? `${formData.first_name} ${formData.last_name}`
    : user?.name || user?.email || 'User';

  const handleAvatarUpdate = (url: string) => {
    setCurrentAvatarUrl(url);
  };

  const handleGenerationCountUpdate = (count: number) => {
    setGenerationCount(count);
  };

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '100ms' }}>
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
        <div className="flex flex-col items-center space-y-4">
          {/* 🎭 My Avatar Section - Enhanced */}
          <div className="text-center space-y-4 p-6 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 rounded-2xl border border-primary/10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                🎭 My Avatar
              </h3>
              {cooldown && (
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <Clock className="h-3 w-3 text-orange-600" />
                  <span className="text-xs text-orange-600 font-medium">{cooldown.daysLeft}d</span>
                </div>
              )}
            </div>
            
            <div 
              className="relative cursor-pointer group mx-auto w-fit"
              onClick={() => setCaricatureModalOpen(true)}
            >
              <Avatar className={`${isMobile ? 'w-28 h-28' : 'w-32 h-32'} ring-4 ring-primary/20 hover:ring-primary/50 transition-all duration-300 group-hover:scale-105 shadow-lg`}>
                {currentAvatarUrl ? (
                  <AvatarImage 
                    src={currentAvatarUrl} 
                    className="object-cover"
                  />
                ) : (
                  <AvatarFallback className={`${isMobile ? 'text-3xl' : 'text-4xl'} gradient-primary text-white`}>
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                {currentAvatarUrl ? (
                  <RefreshCw className="h-7 w-7 text-white group-hover:rotate-180 transition-transform duration-500" />
                ) : (
                  <Camera className="h-7 w-7 text-white" />
                )}
              </div>
              
              {/* Magic sparkle indicator */}
              {currentAvatarUrl && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              )}
              
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400/20 to-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md -z-10"></div>
            </div>
            
            {/* Enhanced status display */}
            <div className="space-y-2">
              {cooldown ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    Next generation in {cooldown.daysLeft} days
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Available on {cooldown.nextAvailable}
                  </p>
                </div>
              ) : (
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  ✨ Ready to generate new avatars!
                </p>
              )}
              
              {user?.caricature_history && user.caricature_history.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {user.caricature_history.length} generation{user.caricature_history.length !== 1 ? 's' : ''} • {user.caricature_history.reduce((total, batch) => total + batch.variants.length, 0)} avatars
                </p>
              )}
            </div>
          </div>

          {/* Name and Info Section */}
          <div className="text-center space-y-2">
            <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground`}>
              {displayName}
            </h2>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>
              {user?.email}
            </p>
            
            {/* Dietary Goals */}
            {user?.dietaryGoals && user.dietaryGoals.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 sm:gap-2 mt-3">
                {user.dietaryGoals.slice(0, isMobile ? 2 : 5).map(goal => (
                  <Badge key={goal} variant="secondary" className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {dietaryGoalOptions.find(opt => opt.id === goal)?.label || goal}
                  </Badge>
                ))}
                {isMobile && user.dietaryGoals.length > 2 && (
                  <Badge variant="outline" className="text-xs">+{user.dietaryGoals.length - 2}</Badge>
                )}
              </div>
            )}
          </div>

          {/* Edit Button */}
          <Button
            variant={isEditing ? "default" : "outline"}
            onClick={onEditToggle}
            size={isMobile ? "sm" : "default"}
            className="w-fit"
          >
            <Settings className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? '' : 'mr-2'}`} />
            {!isMobile && (isEditing ? 'Cancel' : 'Edit Profile')}
          </Button>
        </div>
      </CardHeader>

      {/* Editable Fields */}
      {isEditing && (
        <CardContent className={`space-y-4 ${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
            <div className="space-y-2">
              <Label htmlFor="first_name" className={`${isMobile ? 'text-sm' : 'text-base'}`}>First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => onFormDataChange({ first_name: e.target.value })}
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => onFormDataChange({ last_name: e.target.value })}
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
                placeholder="Enter last name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Email</Label>
            <Input
              id="email"
              value={formData.email}
              disabled
              className={`bg-muted/50 ${isMobile ? 'h-10' : 'h-12'}`}
            />
          </div>
        </CardContent>
      )}

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
    </Card>
  );
};
