import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Wand2, Check, RotateCcw, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateImageFile } from "@/utils/imageValidation";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
}

export const CaricatureModal = ({ 
  isOpen, 
  onClose, 
  userId, 
  currentAvatarUrl, 
  onAvatarUpdate, 
  generationCount, 
  onGenerationCountUpdate,
  avatarVariants 
}: CaricatureModalProps) => {
  const [step, setStep] = useState<'upload' | 'variants'>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<string[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [hoveredVariant, setHoveredVariant] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
    if (!uploadedImage) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generateCaricatureImage', {
        body: { imageUrl: uploadedImage }
      });

      if (error) throw error;

      if (data?.caricatureUrls) {
        setVariants(data.caricatureUrls);
        setStep('variants');
        onGenerationCountUpdate(data.generationCount);
        toast({
          title: "Caricatures generated!",
          description: "Choose your favorite style",
        });
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
      toast({
        title: "Avatar updated!",
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

  const handleRegenerateVariants = async () => {
    if (generationCount >= 3) {
      toast({
        title: "Generation limit reached",
        description: "You've used all 3 generations for this month",
        variant: "destructive",
      });
      return;
    }
    await generateCaricatureVariants();
  };

  const handleGenerateClick = async () => {
    if (generationCount >= 3) {
      toast({
        title: "Generation limit reached",
        description: "You've used all 3 generations for this month",
        variant: "destructive",
      });
      return;
    }
    await generateCaricatureVariants();
  };

  const resetModal = () => {
    setStep('upload');
    setUploadedImage(null);
    setVariants([]);
    setSelectedVariant(null);
    setIsGenerating(false);
    setHoveredVariant(null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const savedVariants = avatarVariants ? [
    avatarVariants.variant_1,
    avatarVariants.variant_2,
    avatarVariants.variant_3
  ].filter(Boolean) as string[] : [];

  const hasExistingVariants = savedVariants.length > 0;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {isMobile ? (
        <DialogContent className="sm:max-w-2xl h-[90vh] overflow-y-auto" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-center">
              My Avatar
            </DialogTitle>
          </DialogHeader>
          
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mb-4">
                  <Avatar className="w-24 h-24 mx-auto">
                    <AvatarImage src={currentAvatarUrl} />
                    <AvatarFallback className="text-2xl">
                      {userId.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a photo to generate AI caricature avatars
                </p>
                
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <Button 
                    onClick={handleUploadClick}
                    className="w-full" 
                    size="lg"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  
                  {uploadedImage && (
                    <Button 
                      onClick={handleGenerateClick}
                      variant="secondary"
                      className="w-full"
                      size="lg"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Caricatures
                    </Button>
                  )}

                  {hasExistingVariants && (
                    <Button 
                      onClick={() => {
                        setVariants(savedVariants);
                        setStep('variants');
                      }}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Switch Avatar Style
                    </Button>
                  )}
                </div>
                
                <div className="mt-4 text-xs text-muted-foreground">
                  Generations used: {generationCount}/3
                </div>
              </div>
            </div>
          )}

          {step === 'variants' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={uploadedImage || currentAvatarUrl} 
                  alt="Original" 
                  className="w-16 h-16 rounded-full object-cover border-2"
                />
                <div className="text-sm">
                  <p className="font-medium">Original Photo</p>
                  <p className="text-muted-foreground">Choose your favorite style</p>
                </div>
              </div>

              {isGenerating ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">
                    Generating your caricatures...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-6">
                    {variants.map((variant, index) => (
                      <div 
                        key={index}
                        className={cn(
                          "relative group cursor-pointer transform transition-all duration-300 rounded-xl overflow-hidden",
                          "hover:scale-[1.02] hover:shadow-2xl",
                          hoveredVariant === variant && "scale-[1.02] shadow-2xl",
                          "border-4 border-transparent hover:border-primary/20",
                          "bg-gradient-to-br from-primary/5 to-secondary/5"
                        )}
                        onClick={() => handleSelectVariant(variant, index + 1)}
                        onTouchStart={() => setHoveredVariant(variant)}
                        onTouchEnd={() => setHoveredVariant(null)}
                      >
                        <div className="relative overflow-hidden">
                          <img 
                            src={variant} 
                            alt={`Caricature ${index + 1}`}
                            className="w-full h-64 sm:h-72 object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          {/* Glow effect */}
                          <div className={cn(
                            "absolute inset-0 rounded-lg transition-all duration-300",
                            hoveredVariant === variant 
                              ? "shadow-[inset_0_0_50px_rgba(var(--primary),0.3)] ring-2 ring-primary/30" 
                              : ""
                          )} />
                        </div>
                        
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                          <div className="flex items-center justify-between text-white">
                            <span className="text-sm font-medium">
                              {index === 0 ? "Pixar Style" : index === 1 ? "Digital Art" : "Cartoon Fun"}
                            </span>
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                              {index + 1}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
                    💡 Tap a variant to preview it in full. You can change your avatar anytime.
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {!isGenerating && variants.length > 0 && (
                  <Button 
                    onClick={handleRegenerateVariants}
                    variant="outline"
                    className="flex-1"
                    disabled={generationCount >= 3}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                )}
                <Button 
                  onClick={() => setStep('upload')}
                  variant="ghost"
                  className="flex-1"
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-center pt-4">
            <Button 
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      ) : (
        <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-center">
              My Avatar
            </DialogTitle>
          </DialogHeader>
          
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mb-4">
                  <Avatar className="w-24 h-24 mx-auto">
                    <AvatarImage src={currentAvatarUrl} />
                    <AvatarFallback className="text-2xl">
                      {userId.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a photo to generate AI caricature avatars
                </p>
                
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <Button 
                    onClick={handleUploadClick}
                    className="w-full" 
                    size="lg"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  
                  {uploadedImage && (
                    <Button 
                      onClick={handleGenerateClick}
                      variant="secondary"
                      className="w-full"
                      size="lg"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Caricatures
                    </Button>
                  )}

                  {hasExistingVariants && (
                    <Button 
                      onClick={() => {
                        setVariants(savedVariants);
                        setStep('variants');
                      }}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Switch Avatar Style
                    </Button>
                  )}
                </div>
                
                <div className="mt-4 text-xs text-muted-foreground">
                  Generations used: {generationCount}/3
                </div>
              </div>
            </div>
          )}

          {step === 'variants' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={uploadedImage || currentAvatarUrl} 
                  alt="Original" 
                  className="w-16 h-16 rounded-full object-cover border-2"
                />
                <div className="text-sm">
                  <p className="font-medium">Original Photo</p>
                  <p className="text-muted-foreground">Choose your favorite style</p>
                </div>
              </div>

              {isGenerating ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">
                    Generating your caricatures...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-6">
                    {variants.map((variant, index) => (
                      <div 
                        key={index}
                        className={cn(
                          "relative group cursor-pointer transform transition-all duration-300 rounded-xl overflow-hidden",
                          "hover:scale-[1.02] hover:shadow-2xl",
                          hoveredVariant === variant && "scale-[1.02] shadow-2xl",
                          "border-4 border-transparent hover:border-primary/20",
                          "bg-gradient-to-br from-primary/5 to-secondary/5"
                        )}
                        onClick={() => handleSelectVariant(variant, index + 1)}
                        onMouseEnter={() => setHoveredVariant(variant)}
                        onMouseLeave={() => setHoveredVariant(null)}
                      >
                        <div className="relative overflow-hidden">
                          <img 
                            src={variant} 
                            alt={`Caricature ${index + 1}`}
                            className="w-full h-64 sm:h-72 object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          {/* Glow effect */}
                          <div className={cn(
                            "absolute inset-0 rounded-lg transition-all duration-300",
                            hoveredVariant === variant 
                              ? "shadow-[inset_0_0_50px_rgba(var(--primary),0.3)] ring-2 ring-primary/30" 
                              : ""
                          )} />
                        </div>
                        
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                          <div className="flex items-center justify-between text-white">
                            <span className="text-sm font-medium">
                              {index === 0 ? "Pixar Style" : index === 1 ? "Digital Art" : "Cartoon Fun"}
                            </span>
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                              {index + 1}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
                    💡 Tap a variant to preview it in full. You can change your avatar anytime.
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {!isGenerating && variants.length > 0 && (
                  <Button 
                    onClick={handleRegenerateVariants}
                    variant="outline"
                    className="flex-1"
                    disabled={generationCount >= 3}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                )}
                <Button 
                  onClick={() => setStep('upload')}
                  variant="ghost"
                  className="flex-1"
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-center pt-4">
            <Button 
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
};