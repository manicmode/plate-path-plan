
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Save } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth';
import { withStabilizedViewport } from '@/utils/scrollStabilizer';

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
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [username, setUsername] = useState(formData.first_name || '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  // Keep username in sync with formData changes
  useEffect(() => {
    setUsername(formData.first_name || '');
  }, [formData.first_name]);
  
  // Focus without scrolling when entering edit mode
  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          inputRef.current?.focus?.({ preventScroll: true } as any);
        });
      });
    }
  }, [isEditing]);
  
  const displayName = username || user?.name || user?.email || 'User';

  const handleSave = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not found. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Username cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          first_name: username.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error updating username:', error);
        toast({
          title: "Error",
          description: "Failed to save username. Please try again.",
          variant: "destructive"
        });
        return;
      }

      

      // Update form data to keep parent in sync
      onFormDataChange({ first_name: username.trim() });

      // Refresh user profile to update auth context
      if (refreshUser) {
        await refreshUser();
      }

      // Exit edit mode
      onEditToggle();

      toast({
        title: "Success!",
        description: "Username updated successfully.",
      });
      
    } catch (error) {
      console.error('❌ Error updating username:', error);
      toast({
        title: "Error", 
        description: "Failed to save username. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl ProfileCard IdentityCard" style={{ animationDelay: '100ms' }}>
      <div className={`IdentitySummary ${isEditing ? 'isHidden' : ''}`}>
        <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
          <div className="flex flex-col items-center space-y-4">
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                withStabilizedViewport(() => onEditToggle());
              }}
              size={isMobile ? "sm" : "default"}
              className="w-fit"
              style={{ touchAction: 'manipulation' }}
            >
              <Settings className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? '' : 'mr-2'}`} />
              {!isMobile && (isEditing ? 'Cancel' : 'Edit Profile')}
            </Button>
          </div>
        </CardHeader>
      </div>

      <div className={`IdentityEditorOverlay ${!isEditing ? 'isHidden' : ''}`}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Username</Label>
            <Input
              id="username"
              ref={inputRef}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
              placeholder="Enter username"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>
          <Button
            type="submit"
            disabled={isSaving || !username.trim()}
            className={`w-full ${isMobile ? 'h-10' : 'h-12'}`}
            size={isMobile ? "sm" : "default"}
          >
            <Save className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </div>
    </Card>
  );
};
