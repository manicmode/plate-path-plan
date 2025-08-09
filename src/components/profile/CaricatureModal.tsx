import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Wand2, Check, Shuffle, Download, Sparkles, Clock, RefreshCw, Loader2 } from "lucide-react";
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
  const [step, setStep] = useState<'upload' | 'variants' | 'avatars'>('upload');
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

  // Get all historical avatars with 20 limit and auto-delete oldest
  const getAllHistoricalAvatars = () => {
    const allAvatars: string[] = [];
    // Sort history by date (newest first) before extracting avatars
    const sortedHistory = [...caricatureHistory].sort((a, b) => 
      new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
    );
    
    sortedHistory.forEach(batch => {
      allAvatars.push(...batch.variants);
    });
    
    // Return only the most recent 20 avatars
    return allAvatars.slice(0, 20);
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
    // Validate photo is uploaded first
    if (!uploadedImage) {
      toast({
        title: "Please upload a photo first",
        description: "You need to upload a photo before generating caricatures",
        variant: "destructive",
      });
      return;
    }

    // Enhanced debounce: Prevent multiple clicks during generation
      return;

    // Check monthly limit properly - count generations in the current calendar month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const generationsThisMonth = caricatureHistory.filter(batch => {
      const batchDate = new Date(batch.generated_at);
      return batchDate.getMonth() === currentMonth && batchDate.getFullYear() === currentYear;
    }).length;

    if (generationsThisMonth >= 3) {
      toast({
        title: "Monthly limit reached",
        description: "You've reached your 3 avatar generations this month. Come back next month to generate more!",
        variant: "destructive",
      });
      return;
    }

    
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generateCaricatureImage', {
        body: { imageUrl: uploadedImage }
      });


      // Handle Supabase function errors with improved parsing
      if (error) {
        console.error('❌ Supabase function error:', error);
        
        // Handle FunctionsHttpError specifically
        if (error.constructor.name === 'FunctionsHttpError') {
          try {
            const details = await error.response?.json?.();
            
            
            if (details?.errorType === "limit_reached") {
              toast({
                title: "Monthly limit reached",
                description: `🎭 You've already created 3 avatars this month! Come back on ${details.nextAvailableDateFormatted} to get your next set.`,
                variant: "destructive",
              });
              return;
            } else {
              toast({
                title: "Generation failed",
                description: `Something went wrong while generating avatars. Error: ${details?.error || error.message}`,
                variant: "destructive",
              });
              return;
            }
          } catch (parseError) {
            console.warn('Could not parse error response:', parseError);
          }
        }
        
        // Fallback error handling
        toast({
          title: "Generation failed",
          description: `Something went wrong while generating avatars. Error: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      // Handle successful response
      if (data?.caricatureUrls && Array.isArray(data.caricatureUrls) && data.caricatureUrls.length === 3) {
        
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
      } else if (data?.error) {
        // Handle errors returned in data
        console.error('❌ Error from edge function:', data.error);
        const errorMsg = data.error;
        
        if (data?.errorType === 'limit_reached') {
          toast({
            title: "Monthly limit reached",
            description: `🎭 You've already created 3 avatars this month! Come back on ${data.nextAvailableDateFormatted} to get your next set.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Generation failed",
            description: `Something went wrong while generating avatars. Error: ${data.error}`,
            variant: "destructive",
          });
        }
      } else {
        console.error('❌ Invalid response data:', data);
        toast({
          title: "Generation failed",
          description: "Something went wrong while generating avatars. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('💥 Generation failed with network error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      
      toast({
        title: "Generation failed",
        description: `Something went wrong while generating avatars. Error: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      
      setIsGenerating(false);
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

  // Check if user has reached monthly limit - fixed to use calendar month
  const hasReachedMonthlyLimit = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const generationsThisMonth = caricatureHistory.filter(batch => {
      const batchDate = new Date(batch.generated_at);
      return batchDate.getMonth() === currentMonth && batchDate.getFullYear() === currentYear;
    }).length;
    
    return generationsThisMonth >= 3;
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Clean click handler for buttons to prevent double-tap issues
  const handleButtonClick = (callback: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isGenerating && !generationDisabled) {
      callback();
    }
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
          
          {/* Tab Navigation */}
          {allHistoricalAvatars.length > 0 && (
            <div className="flex justify-center mt-4 mb-2">
              <div className="flex bg-muted rounded-lg p-1">
                 <Button
                   variant={step === 'upload' ? 'default' : 'ghost'}
                   size="sm"
                   onClick={handleButtonClick(() => setStep('upload'))}
                   className="rounded-md"
                   style={{ touchAction: 'manipulation' }}
                 >
                   Generate
                 </Button>
                 <Button
                   variant={step === 'avatars' ? 'default' : 'ghost'}
                   size="sm"
                   onClick={handleButtonClick(() => setStep('avatars'))}
                   className="rounded-md"
                   style={{ touchAction: 'manipulation' }}
                 >
                   My Avatars
                 </Button>
              </div>
            </div>
          )}
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
                    variant="outline"
                    className="w-full h-12 text-base font-medium border-2 border-primary/30 hover:border-primary/60 active:scale-95 transition-transform"
                    size="lg"
                    disabled={isGenerating || generationDisabled}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Replace Photo
                  </Button>
                )}
                
                {uploadedImage && (
                  <Button 
                    onClick={() => {
                      if (hasReachedMonthlyLimit()) {
                        toast({
                          title: "Monthly limit reached",
                          description: "You've reached your 3 avatar generations this month. Come back next month to generate more!",
                          variant: "destructive",
                        });
                      } else {
                        generateCaricatureVariants();
                      }
                    }}
                    className={cn(
                      "w-full h-14 text-lg font-semibold bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600",
                      "active:scale-95 transition-all duration-200",
                      "shadow-lg hover:shadow-xl",
                      !isGenerating && !generationDisabled && uploadedImage && "hover:animate-pulse",
                      isGenerating && "cursor-not-allowed opacity-90"
                    )}
                    size="lg"
                    disabled={isGenerating || generationDisabled || !uploadedImage}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
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

            {/* Quick Actions */}
            {allHistoricalAvatars.length > 0 && (
              <div className="flex gap-3">
                <Button
                  onClick={handleSurpriseMe}
                  variant="outline"
                  className="flex-1 h-12 font-medium active:scale-95 transition-transform"
                  disabled={allHistoricalAvatars.length === 0}
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  🎲 Surprise Me
                </Button>
                <Button
                  onClick={handleExportAvatar}
                  variant="outline"
                  className="flex-1 h-12 font-medium active:scale-95 transition-transform"
                  disabled={!currentAvatarUrl}
                >
                  <Download className="w-4 h-4 mr-2" />
                  📥 Export
                </Button>
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

        {step === 'avatars' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-4">🎨 My Avatar Collection</h3>
              <p className="text-muted-foreground">Tap any avatar to instantly switch</p>
            </div>

            {allHistoricalAvatars.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {allHistoricalAvatars.map((avatar, index) => (
                  <div
                    key={index}
                    className={cn(
                      "relative cursor-pointer group rounded-xl overflow-hidden",
                      "transform transition-all duration-300 hover:scale-105",
                      "ring-2 ring-transparent hover:ring-primary/50",
                      currentAvatarUrl === avatar && "ring-primary ring-4"
                    )}
                    onClick={() => handleSelectVariant(avatar, 1)}
                  >
                    <img
                      src={avatar}
                      alt={`Avatar ${index + 1}`}
                      className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-2 left-2 right-2 text-center">
                        <Check className="h-4 w-4 text-white mx-auto" />
                      </div>
                    </div>
                    {currentAvatarUrl === avatar && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold mb-2">No Avatars Yet</h4>
                <p className="text-muted-foreground mb-6">
                  Generate your first set of magical avatars to get started!
                </p>
                <Button onClick={() => setStep('upload')} variant="outline">
                  Go to Generator
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            {allHistoricalAvatars.length > 0 && (
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSurpriseMe}
                  variant="outline"
                  className="flex-1 h-12 font-medium active:scale-95 transition-transform"
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  🎲 Surprise Me
                </Button>
                <Button
                  onClick={handleExportAvatar}
                  variant="outline"
                  className="flex-1 h-12 font-medium active:scale-95 transition-transform"
                  disabled={!currentAvatarUrl}
                >
                  <Download className="w-4 h-4 mr-2" />
                  📥 Export
                </Button>
              </div>
            )}
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