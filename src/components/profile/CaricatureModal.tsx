import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Wand2, Check, Shuffle, Download, Sparkles, Clock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateImageFile } from "@/utils/imageValidation";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface CaricatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentAvatarUrl?: string;
  onAvatarUpdate: (url: string) => void;
  generationCount: number;
  onGenerationCountUpdate: (count: number) => void;
  avatarVariants?: {
    variant_1?: string;
    variant_2?: string;
    variant_3?: string;
    selected_avatar_variant?: number;
  };
  caricatureHistory?: Array<{
    timestamp: string;
    variants: string[];
    generated_at: string;
  }>;
  lastCaricatureGeneration?: string;
}

export const CaricatureModal = ({ 
  isOpen, 
  onClose, 
  userId, 
  currentAvatarUrl, 
  onAvatarUpdate, 
  generationCount, 
  onGenerationCountUpdate,
  avatarVariants,
  caricatureHistory = [],
  lastCaricatureGeneration
}: CaricatureModalProps) => {
  const [step, setStep] = useState<'upload' | 'variants'>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<string[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [hoveredVariant, setHoveredVariant] = useState<string | null>(null);
  const [generationDisabled, setGenerationDisabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Calculate cooldown
  const calculateCooldown = () => {
    if (!lastCaricatureGeneration) return null;
    
    const lastGen = new Date(lastCaricatureGeneration);
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

  // Get all historical avatars
  const getAllHistoricalAvatars = () => {
    const allAvatars: string[] = [];
    caricatureHistory.forEach(batch => {
      allAvatars.push(...batch.variants);
    });
    return allAvatars;
  };

  const allHistoricalAvatars = getAllHistoricalAvatars();

  const handleImageUpload = async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    if (validation.warning) {
      toast({
        title: "Large File Warning",
        description: validation.warning,
        variant: "default",
      });
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setUploadedImage(data.publicUrl);
      
      toast({
        title: "Image uploaded successfully!",
        description: "Ready to generate caricatures",
      });
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const generateCaricatureVariants = async () => {
    if (!uploadedImage || isGenerating || generationDisabled) return;

    // Check cooldown
    if (cooldown) {
      toast({
        title: "Generation on cooldown",
        description: `🎨 Your next avatar set will be available on ${cooldown.nextAvailable}!`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationDisabled(true); // Prevent duplicate clicks
    
    try {
      const { data, error } = await supabase.functions.invoke('generateCaricatureImage', {
        body: { imageUrl: uploadedImage }
      });

      if (error) throw error;

      if (data?.caricatureUrls && data.caricatureUrls.length === 3) {
        setVariants(data.caricatureUrls);
        setStep('variants');
        onGenerationCountUpdate(generationCount + 1);
        
        // Trigger celebration animation
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        toast({
          title: "🎉 Caricatures generated!",
          description: "Choose your favorite style",
        });
      } else {
        throw new Error("Failed to generate all 3 variants");
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationDisabled(false);
    }
  };

  const handleSelectVariant = async (variant: string, variantNumber: number) => {
    try {
      setSelectedVariant(variant);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          avatar_url: variant,
          selected_avatar_variant: variantNumber
        })
        .eq('user_id', userId);

      if (error) throw error;

      onAvatarUpdate(variant);
      
      // Trigger celebration animation
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.7 },
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffd93d']
      });
      
      toast({
        title: "✨ Avatar updated!",
        description: "Your new caricature avatar has been set",
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to update avatar:', error);
      toast({
        title: "Update failed",
        description: "Failed to set your avatar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSurpriseMe = () => {
    if (allHistoricalAvatars.length === 0) return;
    
    const randomAvatar = allHistoricalAvatars[Math.floor(Math.random() * allHistoricalAvatars.length)];
    handleSelectVariant(randomAvatar, 1);
  };

  const handleExportAvatar = async () => {
    if (!currentAvatarUrl) return;
    
    try {
      const response = await fetch(currentAvatarUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'my-avatar.png';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Avatar exported!",
        description: "Your avatar has been downloaded",
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export failed",
        description: "Failed to export avatar",
        variant: "destructive",
      });
    }
  };

  const resetModal = () => {
    setStep('upload');
    setUploadedImage(null);
    setVariants([]);
    setSelectedVariant(null);
    setIsGenerating(false);
    setHoveredVariant(null);
    setGenerationDisabled(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleTouchEnd = (callback: () => void) => (e: React.TouchEvent) => {
    e.preventDefault();
    callback();
  };

  const savedVariants = avatarVariants ? [
    avatarVariants.variant_1,
    avatarVariants.variant_2,
    avatarVariants.variant_3
  ].filter(Boolean) as string[] : [];

  const hasExistingVariants = savedVariants.length > 0;

  useEffect(() => {
    if (isOpen) {
      // Open file dialog immediately when modal opens
      setTimeout(() => {
        if (step === 'upload' && !uploadedImage) {
          handleUploadClick();
        }
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" showCloseButton={false}>
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🎭 My Avatar Studio
          </DialogTitle>
        </DialogHeader>
        
        {step === 'upload' && (
          <div className="space-y-4">
            {/* Large Avatar Display */}
            <div className="text-center">
              <div className="relative mb-4">
                <Avatar className={cn(
                  "mx-auto ring-4 ring-primary/20 hover:ring-primary/40 transition-all duration-300",
                  isMobile ? "w-40 h-40" : "w-48 h-48"
                )}>
                  <AvatarImage src={currentAvatarUrl} className="object-cover" />
                  <AvatarFallback className="text-4xl gradient-primary text-white">
                    {userId.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {currentAvatarUrl && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              
              <p className={cn("text-muted-foreground mb-4", isMobile ? "text-base" : "text-lg")}>
                Create magical AI caricature avatars that look just like you!
              </p>
              
              {/* Cooldown Display */}
              {cooldown && (
                <div className="mb-4 p-3 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-center gap-2 text-orange-700 dark:text-orange-300">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium text-sm">Next avatar generation available in {cooldown.daysLeft} days</span>
                  </div>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    🎨 Available on {cooldown.nextAvailable}!
                  </p>
                </div>
              )}
              
              {/* Photo Upload Preview */}
              {uploadedImage && (
                <div className="mb-4 p-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden ring-2 ring-green-300">
                      <img src={uploadedImage} alt="Uploaded photo" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-green-700 dark:text-green-300 font-medium text-sm">✅ Image Ready!</p>
                      <p className="text-green-600 dark:text-green-400 text-xs">Photo uploaded successfully</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                
                {!uploadedImage ? (
                  <Button 
                    onClick={handleUploadClick}
                    onTouchEnd={handleTouchEnd(handleUploadClick)}
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 active:scale-95 transition-transform"
                    size="lg"
                    disabled={isGenerating || generationDisabled}
                  >
                    <Upload className="w-5 h-5 mr-3" />
                    Upload Photo
                  </Button>
                ) : (
                  <Button 
                    onClick={handleUploadClick}
                    onTouchEnd={handleTouchEnd(handleUploadClick)}
                    variant="outline"
                    className="w-full h-12 text-base font-medium border-2 border-primary/30 hover:border-primary/60 active:scale-95 transition-transform"
                    size="lg"
                    disabled={isGenerating || generationDisabled}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Replace Photo
                  </Button>
                )}
                
                {uploadedImage && !cooldown && (
                  <Button 
                    onClick={generateCaricatureVariants}
                    onTouchEnd={handleTouchEnd(generateCaricatureVariants)}
                    className={cn(
                      "w-full h-14 text-lg font-semibold bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600",
                      "active:scale-95 transition-all duration-200",
                      !isGenerating && !generationDisabled && "animate-pulse hover:animate-none",
                      "shadow-lg hover:shadow-xl"
                    )}
                    size="lg"
                    disabled={isGenerating || generationDisabled || !uploadedImage}
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                        Summoning your cartoon twin…
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5 mr-3" />
                        <span className="relative">
                          Generate 3 Caricatures
                          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-300 animate-pulse" />
                        </span>
                      </>
                    )}
                  </Button>
                )}

                {hasExistingVariants && (
                  <Button 
                    onClick={() => {
                      setVariants(savedVariants);
                      setStep('variants');
                    }}
                    onTouchEnd={handleTouchEnd(() => {
                      setVariants(savedVariants);
                      setStep('variants');
                    })}
                    variant="outline"
                    className="w-full h-12 text-base font-medium border-2 border-primary/30 hover:border-primary/60 active:scale-95 transition-transform"
                    size="lg"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    View Current Avatars
                  </Button>
                )}
              </div>
            </div>

            {/* Avatar History */}
            {allHistoricalAvatars.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">🎨 Avatar History</h3>
                <div className="max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-2">
                    {allHistoricalAvatars.map((avatar, index) => (
                      <div
                        key={index}
                        className="relative cursor-pointer group"
                         onClick={() => handleSelectVariant(avatar, 1)}
                        onTouchEnd={handleTouchEnd(() => handleSelectVariant(avatar, 1))}
                      >
                        <img
                          src={avatar}
                          alt={`Historical avatar ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-lg ring-2 ring-transparent hover:ring-primary/50 transition-all duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                 {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleSurpriseMe}
                    onTouchEnd={handleTouchEnd(handleSurpriseMe)}
                    variant="outline"
                    className="flex-1 h-12 font-medium active:scale-95 transition-transform"
                    disabled={allHistoricalAvatars.length === 0}
                  >
                    <Shuffle className="w-4 h-4 mr-2" />
                    🎲 Surprise Me
                  </Button>
                  <Button
                    onClick={handleExportAvatar}
                    onTouchEnd={handleTouchEnd(handleExportAvatar)}
                    variant="outline"
                    className="flex-1 h-12 font-medium active:scale-95 transition-transform"
                    disabled={!currentAvatarUrl}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    📥 Export
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'variants' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-4">Choose Your Caricature Style</h3>
              <p className="text-muted-foreground">Tap to select your favorite avatar</p>
            </div>

            {isGenerating ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6"></div>
                <h4 className="text-xl font-semibold mb-2">Summoning your cartoon twin…</h4>
                <p className="text-muted-foreground">
                  Creating 3 unique caricatures that capture your essence
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {variants.map((variant, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "relative group cursor-pointer transform transition-all duration-300 rounded-2xl overflow-hidden",
                      "hover:scale-105 hover:shadow-2xl",
                      hoveredVariant === variant && "scale-105 shadow-2xl",
                      "border-4 border-transparent hover:border-primary/40",
                      "bg-gradient-to-br from-primary/10 to-secondary/10"
                    )}
                     onClick={() => handleSelectVariant(variant, index + 1)}
                    onTouchEnd={handleTouchEnd(() => handleSelectVariant(variant, index + 1))}
                    onMouseEnter={() => setHoveredVariant(variant)}
                    onMouseLeave={() => setHoveredVariant(null)}
                  >
                    <div className="relative overflow-hidden">
                      <img 
                        src={variant} 
                        alt={`Caricature ${index + 1}`}
                        className="w-full h-64 sm:h-80 object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      
                      {/* Glow effect */}
                      <div className={cn(
                        "absolute inset-0 transition-all duration-300",
                        hoveredVariant === variant 
                          ? "shadow-[inset_0_0_100px_rgba(var(--primary),0.4)] ring-4 ring-primary/50" 
                          : ""
                      )} />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                      <div className="flex items-center justify-between text-white">
                        <span className="text-base font-semibold">
                          {index === 0 ? "🎨 Classic Caricature" : index === 1 ? "🎭 Pixar Style" : "🎪 Comic Art"}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                      </div>
                      <p className="text-sm text-white/80 mt-1">Tap to Select</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-center pt-6">
              <Button 
                onClick={() => setStep('upload')}
                variant="outline"
                className="h-12 px-6"
              >
                Back to Upload
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-center pt-6">
          <Button 
            onClick={onClose}
            variant="ghost"
            className="w-full h-12 text-base"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};