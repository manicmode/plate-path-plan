
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { getDisplayName } from '@/lib/displayName';

interface PersonalInformationProps {
  formData: {
    first_name: string;
    email: string;
  };
  user: {
    id?: string;
    user_id?: string;
    name?: string;
    first_name?: string;
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
  
  // Phase 2 & 3: Use current user data first, then fallback to form data for real-time updates
  const displayName = getDisplayName({
    first_name: user?.first_name || formData.first_name,
    email: user?.email
  });

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '100ms' }}>
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
              
              // Store current scroll position
              const currentScrollY = window.scrollY;
              
              onEditToggle();
              
              // Restore scroll position after DOM update
              requestAnimationFrame(() => {
                window.scrollTo({ top: currentScrollY, behavior: 'instant' });
              });
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

      {/* Editable Fields */}
      {isEditing && (
        <CardContent className={`space-y-4 ${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          <div className="space-y-2">
            <Label htmlFor="first_name" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Profile Name</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => onFormDataChange({ first_name: e.target.value })}
              className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
              placeholder="Enter your profile name"
            />
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

    </Card>
  );
};
