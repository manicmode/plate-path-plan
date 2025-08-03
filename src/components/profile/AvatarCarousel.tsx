import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

interface AvatarCarouselProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentAvatarUrl?: string;
  onAvatarUpdate: (url: string) => void;
  caricatureHistory?: Array<{
    timestamp: string;
    variants: string[];
    generated_at: string;
  }>;
}

export const AvatarCarousel = ({
  isOpen,
  onClose,
  userId,
  currentAvatarUrl,
  onAvatarUpdate,
  caricatureHistory = []
}: AvatarCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isChanging, setIsChanging] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Get all historical avatars with generation dates
  const getAllHistoricalAvatars = () => {
    const allAvatars: Array<{ url: string; generatedAt: string }> = [];
    
    // Sort history by date (newest first)
    const sortedHistory = [...caricatureHistory].sort((a, b) => 
      new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
    );
    
    sortedHistory.forEach(batch => {
      batch.variants.forEach(variant => {
        allAvatars.push({
          url: variant,
          generatedAt: batch.generated_at
        });
      });
    });
    
    // Return only the most recent 20 avatars
    return allAvatars.slice(0, 20);
  };

  const allAvatars = getAllHistoricalAvatars();

  // Set initial index to current avatar when modal opens
  useEffect(() => {
    if (isOpen && currentAvatarUrl) {
      const currentIndex = allAvatars.findIndex(avatar => avatar.url === currentAvatarUrl);
      if (currentIndex !== -1) {
        setCurrentIndex(currentIndex);
      }
    }
  }, [isOpen, currentAvatarUrl, allAvatars]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allAvatars.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < allAvatars.length - 1 ? prev + 1 : 0));
  };

  const handleChooseAvatar = async () => {
    if (isChanging || !allAvatars[currentIndex]) return;
    
    setIsChanging(true);
    const selectedAvatar = allAvatars[currentIndex];
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          avatar_url: selectedAvatar.url,
          selected_avatar_variant: 1 // Default variant number
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Call onAvatarUpdate before closing to ensure state updates
      onAvatarUpdate(selectedAvatar.url);
      
      // Trigger celebration animation
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.7 },
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffd93d']
      });
      
      toast({
        title: "✨ Avatar updated!",
        description: "Your avatar has been changed successfully",
      });
      
      // Small delay to ensure state propagation before closing
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error) {
      console.error('Failed to update avatar:', error);
      toast({
        title: "Update failed",
        description: "Failed to set your avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChanging(false);
    }
  };

  // Touch/swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Date unknown';
    }
  };

  if (!isOpen || allAvatars.length === 0) return null;

  const currentAvatar = allAvatars[currentIndex];
  const isCurrentlyActive = currentAvatar?.url === currentAvatarUrl;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-full max-h-full w-full h-full p-0 m-0 border-0 bg-black/95"
        showCloseButton={false}
      >
        <div className="relative w-full h-full flex flex-col">
          {/* Close button */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/10 w-10 h-10"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Header */}
          <div className="flex-shrink-0 text-center pt-16 pb-4 px-4">
            <h2 className="text-white text-xl font-bold mb-2">
              Choose Your Avatar
            </h2>
            <p className="text-white/70 text-sm">
              {currentIndex + 1} of {allAvatars.length}
            </p>
          </div>

          {/* Main carousel area */}
          <div 
            className="flex-1 flex items-center justify-center px-4 relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Previous button */}
            <Button
              onClick={handlePrevious}
              variant="ghost"
              size="icon"
              className="absolute left-4 z-40 text-white hover:bg-white/10 w-12 h-12"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>

            {/* Avatar display */}
            <div className="flex flex-col items-center space-y-6 max-w-sm w-full">
              {/* Avatar image */}
              <div className="relative">
                <div className={cn(
                  "rounded-full overflow-hidden ring-4 ring-white/20",
                  "shadow-2xl transition-all duration-300",
                  isCurrentlyActive && "ring-yellow-400 ring-8",
                  isMobile ? "w-64 h-64" : "w-80 h-80"
                )}>
                  <img
                    src={currentAvatar.url}
                    alt={`Avatar ${currentIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Active avatar indicator */}
                {isCurrentlyActive && (
                  <div className="absolute -top-2 -right-2 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="h-6 w-6 text-black font-bold" />
                  </div>
                )}
              </div>

              {/* Generation date */}
              <p className="text-white/70 text-sm">
                Generated on {formatDate(currentAvatar.generatedAt)}
              </p>

              {/* Choose button */}
              <Button
                onClick={handleChooseAvatar}
                disabled={isChanging || isCurrentlyActive}
                className={cn(
                  "w-full h-14 text-lg font-semibold rounded-2xl",
                  "transition-all duration-200",
                  isCurrentlyActive 
                    ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white",
                  isChanging && "opacity-50 cursor-not-allowed"
                )}
              >
                {isChanging ? (
                  "Updating..."
                ) : isCurrentlyActive ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Currently Active
                  </>
                ) : (
                  "✔ Choose This Avatar"
                )}
              </Button>
            </div>

            {/* Next button */}
            <Button
              onClick={handleNext}
              variant="ghost"
              size="icon"
              className="absolute right-4 z-40 text-white hover:bg-white/10 w-12 h-12"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>

          {/* Swipe hint for mobile */}
          {isMobile && (
            <div className="flex-shrink-0 text-center pb-8 px-4">
              <p className="text-white/50 text-xs">
                ← Swipe to browse avatars →
              </p>
            </div>
          )}

          {/* Dots indicator */}
          <div className="flex-shrink-0 flex justify-center space-x-2 pb-8">
            {allAvatars.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === currentIndex 
                    ? "bg-white scale-125" 
                    : "bg-white/30 hover:bg-white/50"
                )}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};