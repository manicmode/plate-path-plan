import { useState } from 'react';
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
  X 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  const { influencerData, updateProfile, publishToHub, canPublish } = useInfluencerListing();
  
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
      // Save current data first
      await updateProfile.mutateAsync(formData);
      
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
      navigate('/influencer-hub?highlight=me');
      
    } catch (error) {
      console.error('Publish failed:', error);
      toast({
        title: "Publish failed",
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

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.display_name && formData.handle && formData.avatar_url;
      case 2:
        return formData.bio && formData.bio.length >= 80;
      case 3:
        return formData.category_tags && formData.category_tags.length > 0;
      case 4:
        return true; // Social links are optional
      case 5:
        return agreedToTerms && canPublish;
      default:
        return false;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                    <Label htmlFor="avatar">Profile Photo</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {formData.avatar_url ? (
                          <img src={formData.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <Camera className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <Input
                        placeholder="Avatar URL"
                        value={formData.avatar_url || ''}
                        onChange={(e) => updateField('avatar_url', e.target.value)}
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
                    <Label htmlFor="handle">Handle</Label>
                    <Input
                      id="handle"
                      value={formData.handle || ''}
                      onChange={(e) => updateField('handle', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="your_handle"
                      pattern="^[a-z0-9_]{3,24}$"
                    />
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
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio || ''}
                      onChange={(e) => updateField('bio', e.target.value)}
                      placeholder="Share your story, expertise, and what motivates you..."
                      rows={6}
                      minLength={80}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {(formData.bio || '').length}/80 characters minimum
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

                <div className="space-y-4">
                  {['instagram', 'youtube', 'tiktok', 'twitter', 'website'].map((platform) => (
                    <div key={platform}>
                      <Label htmlFor={platform}>{platform.charAt(0).toUpperCase() + platform.slice(1)}</Label>
                      <Input
                        id={platform}
                        value={formData.social_links?.[platform] || ''}
                        onChange={(e) => updateField('social_links', { 
                          ...formData.social_links, 
                          [platform]: e.target.value 
                        })}
                        placeholder={`Your ${platform} URL`}
                        type="url"
                      />
                    </div>
                  ))}
                </div>
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
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
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
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canProceed()}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handlePublish}
                  disabled={!canProceed() || publishToHub.isPending}
                  className="bg-gradient-to-r from-primary to-primary/80"
                >
                  {publishToHub.isPending ? 'Publishing...' : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Publish to Hub
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}