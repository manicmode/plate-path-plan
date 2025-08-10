
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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


const CONTENT_W = "max-w-[380px] md:max-w-[420px]";

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
    <Card className="animate-slide-up glass-card border-0 rounded-3xl ProfileCard IdentityCard relative" style={{ animationDelay: '100ms' }} data-testid="identity-card-root">
      {/* VIEW (summary) */}
      {!isEditing && (
        <CardContent className="px-0 pt-2 pb-3">
          <div className={`IdentityInner mx-auto w-full ${CONTENT_W} px-4 text-center`}>
            <h3 className="text-[18px] font-semibold leading-tight">{displayName}</h3>

            <div className="mt-1 flex items-center justify-center gap-2">
              <p className="text-muted-foreground text-[13px] leading-tight">
                {user?.email}
              </p>
              <button
                type="button"
                aria-label="Edit profile"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  withStabilizedViewport(() => onEditToggle());
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/15 transition"
                style={{ touchAction: 'manipulation' }}
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      )}

      {/* EDIT (overlay or inline — keep your logic) */}
      {isEditing && (
        <div className="IdentityEditorOverlay absolute inset-0 flex justify-center items-start">
          <div className={`IdentityInner mx-auto w-full ${CONTENT_W} px-4 py-3`}>
            <form onSubmit={handleSave}>
              <Label htmlFor="username" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Username</Label>
              <Input
                id="username"
                ref={inputRef}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'} mt-2`}
                placeholder="Enter username"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />

              <Button
                type="submit"
                disabled={isSaving || !username.trim()}
                className={`w-full ${isMobile ? 'h-10' : 'h-12'} mt-3`}
                size={isMobile ? "sm" : "default"}
              >
                <Save className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
};
