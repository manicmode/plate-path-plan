import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Camera, RefreshCw, Upload, Sparkles, Download } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CaricatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentAvatarUrl?: string;
  onAvatarUpdate: (url: string) => void;
  generationCount: number;
  onGenerationCountUpdate: (count: number) => void;
}

export const CaricatureModal = ({ 
  isOpen, 
  onClose, 
  userId, 
  currentAvatarUrl,
  onAvatarUpdate,
  generationCount,
  onGenerationCountUpdate
}: CaricatureModalProps) => {
  const isMobile = useIsMobile();
  const [step, setStep] = useState<'upload' | 'variants'>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<string[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const maxGenerations = 3;
  const canGenerate = generationCount < maxGenerations;

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    try {
      setIsGenerating(true);
      setStep('variants');

      // Upload image to Supabase Storage
      const fileName = `raw/${userId}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        throw new Error('Failed to upload image');
      }

      // Get public URL for the uploaded image
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setUploadedImage(urlData.publicUrl);
      
      // Auto-generate caricatures after upload
      await generateCaricatureVariants(urlData.publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
      setIsGenerating(false);
      setStep('upload');
    }
  };

  const generateCaricatureVariants = async (imageUrl?: string) => {
    if (!canGenerate) {
      toast.error(`Maximum ${maxGenerations} generations reached`);
      return;
    }

    const urlToUse = imageUrl || uploadedImage;
    if (!urlToUse) {
      toast.error('Please upload an image first');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Call the edge function to generate caricatures
      const { data: caricatureData, error: caricatureError } = await supabase.functions.invoke(
        'generateCaricatureImage',
        {
          body: {
            imageUrl: urlToUse,
            userId: userId
          }
        }
      );

      if (caricatureError) {
        throw new Error(caricatureError.message || 'Failed to generate caricatures');
      }

      if (!caricatureData.success) {
        throw new Error(caricatureData.error || 'Failed to generate caricatures');
      }

      setVariants(caricatureData.caricatureUrls);
      onGenerationCountUpdate(caricatureData.generationCount);
      
      toast.success(`Generated ${caricatureData.caricatureUrls.length} caricature variants!`);

    } catch (error) {
      console.error('Error generating caricatures:', error);
      toast.error(error.message || 'Failed to generate caricatures');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectVariant = async (variantUrl: string) => {
    try {
      // Update user profile with selected avatar
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          avatar_url: variantUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      onAvatarUpdate(variantUrl);
      toast.success('Avatar updated successfully! ✨');
      onClose();
      
      // Reset modal state
      setStep('upload');
      setUploadedImage(null);
      setVariants([]);
      setSelectedVariant(null);
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error('Failed to update avatar');
    }
  };

  const handleRegenerateVariants = () => {
    setVariants([]);
    generateCaricatureVariants();
  };

  const handleGenerateClick = () => {
    generateCaricatureVariants();
  };

  const resetModal = () => {
    setStep('upload');
    setUploadedImage(null);
    setVariants([]);
    setSelectedVariant(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        resetModal();
      }
    }}>
      <DialogContent className={`${isMobile ? 'w-[95vw]' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>AI Caricature Avatar</span>
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Upload your photo to generate AI caricature variants
              </p>
              
              {currentAvatarUrl && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Current Avatar:</p>
                  <Avatar className="w-20 h-20 mx-auto">
                    <AvatarImage src={currentAvatarUrl} />
                    <AvatarFallback>You</AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center space-y-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="caricature-upload"
              />
              <Button 
                asChild 
                variant="outline" 
                className="w-full max-w-xs" 
                disabled={!canGenerate}
              >
                <label 
                  htmlFor="caricature-upload" 
                  className={`cursor-pointer ${!canGenerate ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Photo
                </label>
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Generations used: {generationCount}/{maxGenerations}</p>
                {!canGenerate && (
                  <p className="text-amber-600 dark:text-amber-400">
                    You've used all 3 caricature generations 💫
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'variants' && (
          <div className="space-y-6">
            {uploadedImage && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">Your uploaded photo:</p>
                <Avatar className="w-16 h-16 mx-auto mb-4">
                  <AvatarImage src={uploadedImage} />
                </Avatar>
              </div>
            )}

            {isGenerating ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Generating your caricatures… hang tight!</p>
              </div>
            ) : variants.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">Choose Your Caricature</h3>
                
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
                  {variants.map((variant, index) => (
                    <Card 
                      key={index}
                      className={`p-4 cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2 ${
                        selectedVariant === variant 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedVariant(variant)}
                    >
                      <div className="text-center space-y-3">
                        <Avatar className="w-20 h-20 mx-auto ring-2 ring-primary/20">
                          <AvatarImage src={variant} />
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium">Variant {index + 1}</p>
                        {selectedVariant === variant && (
                          <div className="flex justify-center">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => selectedVariant && handleSelectVariant(selectedVariant)}
                    disabled={!selectedVariant}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Use Selected Avatar
                  </Button>
                  
                  {canGenerate && (
                    <Button
                      variant="outline"
                      onClick={handleRegenerateVariants}
                      disabled={isGenerating}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                      Regenerate ({maxGenerations - generationCount} left)
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Button 
                  onClick={handleGenerateClick}
                  disabled={!canGenerate || isGenerating}
                  className="bg-gradient-to-r from-primary to-primary/80"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Caricatures
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};