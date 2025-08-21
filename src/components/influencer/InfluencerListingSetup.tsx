import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Camera, 
  MapPin, 
  Tags, 
  Link as LinkIcon, 
  Eye, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  X,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import { SocialLinksInput } from '@/components/ui/SocialLinksInput';
import { useInfluencerListing, type InfluencerListingData } from '@/data/influencers/useInfluencerListing';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

interface InfluencerListingSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_OPTIONS = [
  'fitness', 'nutrition', 'mindfulness', 'recovery', 'yoga', 'running', 
  'strength', 'wellness', 'mental-health', 'lifestyle'
];

export function InfluencerListingSetup({ open, onOpenChange }: InfluencerListingSetupProps) {
  const navigate = useNavigate();
  const { 
    influencerData, 
    updateProfile, 
    publishToHub, 
    unpublishFromHub, 
    canPublish, 
    getAvatarFallback,
    checkHandleAvailability,
    handleAvailability 
  } = useInfluencerListing();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<InfluencerListingData>>({
    display_name: influencerData?.display_name || '',
    handle: influencerData?.handle || '',
    avatar_url: influencerData?.avatar_url || '',
    headline: influencerData?.headline || '',
    bio: influencerData?.bio || '',
    category_tags: influencerData?.category_tags || [],
    location_city: influencerData?.location_city || '',
    location_country: influencerData?.location_country || '',
    social_links: influencerData?.social_links || {},
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Handle debounced uniqueness checking
  useEffect(() => {
    if (!formData.handle) return;

    const timeoutId = setTimeout(() => {
      checkHandleAvailability(formData.handle!);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.handle, checkHandleAvailability]);

  const updateField = (field: keyof InfluencerListingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(formData);
      toast({
        title: "Profile updated",
        description: "Your changes have been saved."
      });
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: "Save failed", 
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePublish = async () => {
    try {
      // Ensure avatar fallback before publishing
      const dataToSave = { ...formData };
      if (!dataToSave.avatar_url) {
        dataToSave.avatar_url = getAvatarFallback();
      }
      
      // Save current data first
      await updateProfile.mutateAsync(dataToSave);
      
      // Then publish
      await publishToHub.mutateAsync();
      
      // Success feedback
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      toast({
        title: "🎉 Published to Influencer Hub!",
        description: "Your profile is now discoverable by the community."
      });
      
      // Close and redirect
      onOpenChange(false);
      navigate(`/influencer-hub?q=@${formData.handle}`);
      
    } catch (error) {
      console.error('Publish failed:', error);
      toast({
        title: "Publish failed",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishFromHub.mutateAsync();
      
      toast({
        title: "Unpublished from Hub",
        description: "Your profile is no longer discoverable."
      });
      
      onOpenChange(false);
      
    } catch (error) {
      console.error('Unpublish failed:', error);
      toast({
        title: "Unpublish failed",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const toggleCategory = (category: string) => {
    const current = formData.category_tags || [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category].slice(0, 3); // Max 3 tags
    
    updateField('category_tags', updated);
  };

  // Step validation - allows proceeding when step requirements are met
  const canProceedFromStep = (step: number) => {
    switch (step) {
      case 1: // Basics: display name + handle (with availability check)
        return !!(
          formData.display_name?.trim() && 
          formData.handle?.trim() && 
          /^[a-z0-9_]{3,24}$/.test(formData.handle) &&
          handleAvailability.isAvailable !== false
        );
      case 2: // About: bio minimum 80 chars
        return !!(formData.bio?.trim() && formData.bio.trim().length >= 80);
      case 3: // Specialty tags: 1-3 tags required  
        return !!(formData.category_tags && formData.category_tags.length >= 1 && formData.category_tags.length <= 3);
      case 4: // Social links: always optional, can proceed
        return true;
      case 5: // Review: must agree to terms
        return agreedToTerms;
      default:
        return false;
    }
  };

  // Overall validation for publishing
  const canPublishNow = () => {
    const hasNameAndHandle = !!(formData.display_name?.trim() && formData.handle?.trim());
    const hasBio = (formData.bio?.trim()?.length ?? 0) >= 80;
    const hasTags = (formData.category_tags?.length ?? 0) >= 1 && (formData.category_tags?.length ?? 0) <= 3;
    const handleIsValid = handleAvailability.isAvailable !== false;
    return hasNameAndHandle && hasBio && hasTags && handleIsValid && agreedToTerms;
  };

  const nextStep = () => {
    if (currentStep < 5 && canProceedFromStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Add body scroll lock when modal is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pointer-events-auto">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Get Listed on Influencer Hub
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full ${
                  step <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Basics */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Basic Information</h3>
                  <p className="text-muted-foreground">Set up your profile basics</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Profile Photo</Label>
                    <div className="mt-2">
                      <AvatarUpload
                        currentUrl={formData.avatar_url}
                        onUpload={(url) => updateField('avatar_url', url)}
                        onDelete={() => updateField('avatar_url', '')}
                        size="lg"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={formData.display_name || ''}
                      onChange={(e) => updateField('display_name', e.target.value)}
                      placeholder="Your display name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="handle">Hub Handle (public @name) *</Label>
                    <div className="relative mt-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</div>
                      <Input
                        id="handle"
                        value={formData.handle || ''}
                        onChange={(e) => {
                          const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                          updateField('handle', cleaned);
                        }}
                        placeholder="your_handle"
                        className="pl-8"
                        maxLength={24}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {handleAvailability.isChecking && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {handleAvailability.isAvailable === true && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {handleAvailability.isAvailable === false && (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Shown in your URL (voyage.app/c/@name). Lowercase letters, numbers, underscores.
                    </div>
                    {handleAvailability.error && (
                      <div className="text-xs text-destructive mt-1">{handleAvailability.error}</div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="headline">Headline (Optional)</Label>
                    <Input
                      id="headline"
                      value={formData.headline || ''}
                      onChange={(e) => updateField('headline', e.target.value)}
                      placeholder="One-line description of what you do"
                      maxLength={100}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: About */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">About You</h3>
                  <p className="text-muted-foreground">Tell people about your journey</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bio">Bio *</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio || ''}
                      onChange={(e) => updateField('bio', e.target.value)}
                      placeholder="Share your story, expertise, and what motivates you..."
                      rows={6}
                      className="mt-1"
                    />
                    <div className={`text-xs mt-1 ${(formData.bio?.trim()?.length ?? 0) >= 80 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {formData.bio?.trim()?.length ?? 0}/80 characters minimum
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.location_city || ''}
                        onChange={(e) => updateField('location_city', e.target.value)}
                        placeholder="Your city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.location_country || ''}
                        onChange={(e) => updateField('location_country', e.target.value)}
                        placeholder="Your country"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Categories */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Your Specialties</h3>
                  <p className="text-muted-foreground">Select 1-3 categories that describe your content</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {CATEGORY_OPTIONS.map((category) => (
                    <Button
                      key={category}
                      variant={formData.category_tags?.includes(category) ? "default" : "outline"}
                      onClick={() => toggleCategory(category)}
                      disabled={!formData.category_tags?.includes(category) && (formData.category_tags?.length || 0) >= 3}
                      className="justify-start"
                    >
                      <Tags className="h-4 w-4 mr-2" />
                      {category.replace('-', ' ')}
                    </Button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {formData.category_tags?.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 4: Social Links */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Social Links</h3>
                  <p className="text-muted-foreground">Connect your social profiles (optional)</p>
                </div>

                <SocialLinksInput
                  values={formData.social_links || {}}
                  onChange={(links) => updateField('social_links', links)}
                />
              </motion.div>
            )}

            {/* Step 5: Preview & Publish */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Preview & Publish</h3>
                  <p className="text-muted-foreground">This is how your profile will appear</p>
                </div>

                {/* Preview Card */}
                <div className="p-6 border rounded-xl bg-gradient-to-br from-primary/5 to-primary/10">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-full overflow-hidden bg-muted">
                      {formData.avatar_url ? (
                        <img src={formData.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-lg">{formData.display_name || 'Your Name'}</h4>
                      <p className="text-muted-foreground">@{formData.handle || 'your_handle'}</p>
                      {formData.headline && (
                        <p className="text-sm mt-1 font-medium">{formData.headline}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {formData.category_tags?.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag.replace('-', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  {formData.bio && (
                    <p className="mt-4 text-sm text-muted-foreground line-clamp-3">{formData.bio}</p>
                  )}
                </div>

                {/* Validation summary */}
                {!canPublishNow() && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive mb-2">Complete these requirements:</p>
                    <div className="space-y-1 text-xs">
                      {!formData.display_name && <p>• Add display name</p>}
                      {!formData.handle && <p>• Add handle</p>}
                      {(!formData.bio || formData.bio.length < 80) && <p>• Bio must be at least 80 characters</p>}
                      {(!formData.category_tags || formData.category_tags.length === 0) && <p>• Select at least 1 specialty tag</p>}
                      {!agreedToTerms && <p>• Agree to terms</p>}
                    </div>
                  </div>
                )}
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  />
                  <label htmlFor="terms" className="text-sm leading-relaxed">
                    I agree to be discoverable on the Influencer Hub and follow the community guidelines.
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
              Back
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? 'Saving...' : 'Save Draft'}
              </Button>

              {currentStep < 5 ? (
                <Button
                  onClick={nextStep}
                  disabled={!canProceedFromStep(currentStep)}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  {influencerData?.is_listed && (
                    <Button
                      variant="outline"
                      onClick={handleUnpublish}
                      disabled={unpublishFromHub.isPending}
                    >
                      {unpublishFromHub.isPending ? 'Unpublishing...' : 'Unpublish'}
                    </Button>
                  )}
                  <Button
                    onClick={handlePublish}
                    disabled={!canPublishNow() || publishToHub.isPending}
                    className="bg-gradient-to-r from-primary to-primary/80"
                  >
                    {publishToHub.isPending ? 'Publishing...' : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {influencerData?.is_listed ? 'Update & Republish' : 'Publish to Hub'}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}