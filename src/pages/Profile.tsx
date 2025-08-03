
import React from 'react';
import { BadgeProvider } from '@/contexts/BadgeContext';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { StreakBadgesSection } from '@/components/analytics/StreakBadgesSection';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { PersonalInformation } from '@/components/profile/PersonalInformation';
import { NutritionGoals } from '@/components/profile/NutritionGoals';
import { DietaryGoals } from '@/components/profile/DietaryGoals';
import { TrackerSelection } from '@/components/profile/TrackerSelection';
import { AllergiesSection } from '@/components/profile/AllergiesSection';
import { NotificationSettings } from '@/components/profile/NotificationSettings';
import { ProfileActions } from '@/components/profile/ProfileActions';
import { LogoutSection } from '@/components/profile/LogoutSection';
import { DailyTargetsCard } from '@/components/profile/DailyTargetsCard';
import { BackfillTargetsButton } from '@/components/profile/BackfillTargetsButton';
import { MoodLogTester } from '@/components/mood/MoodLogTester';
import { DailyTargetsTestSuite } from '@/components/debug/DailyTargetsTestSuite';
import { NutritionTargetsTestComponent } from '@/components/debug/NutritionTargetsTestComponent';
import { TargetsTestButton } from '@/components/debug/TargetsTestButton';
import { ReminderManagement } from '@/components/reminder/ReminderManagement';
import { GlobalBarcodeSettings } from '@/components/profile/GlobalBarcodeSettings';
import { OnboardingCompletionCard } from '@/components/profile/OnboardingCompletionCard';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { AvatarHeroCard } from '@/components/profile/AvatarHeroCard';
import { HealthGoalSettings } from '@/components/profile/HealthGoalSettings';
import { ContactSync } from '@/components/profile/ContactSync';
import { FollowStatsCard } from '@/components/social/FollowStatsCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAutoFilledTrackers } from '@/lib/trackerUtils';
import { SoundTestComponent } from '@/components/debug/SoundTestComponent';

// Helper function to save preferences
const saveUserPreferences = (preferences: any) => {
  try {
    console.log('Saving preferences to localStorage:', preferences);
    localStorage.setItem('user_preferences', JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
};

export default function Profile() {
  return (
    <BadgeProvider>
      <ProfileContent />
    </BadgeProvider>
  );
}

const ProfileContent = () => {
  const { user, updateProfile, updateSelectedTrackers, logout, refreshUser } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  
  // Use the scroll-to-top hook
  useScrollToTop();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHealthSettings, setShowHealthSettings] = useState(false);
  const { toast } = useToast();
  const [userSelectedTrackers, setUserSelectedTrackers] = useState<string[]>(
    user?.selectedTrackers || ['calories', 'protein', 'supplements']
  );
  
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    email: user?.email || '',
    targetCalories: user?.targetCalories || 2000,
    targetProtein: user?.targetProtein || 150,
    targetCarbs: user?.targetCarbs || 200,
    targetFat: user?.targetFat || 65,
    targetHydration: user?.targetHydration || 8,
    targetSupplements: user?.targetSupplements || 3,
    allergies: user?.allergies?.join(', ') || '',
    dietaryGoals: user?.dietaryGoals || [],
    selectedTrackers: getAutoFilledTrackers(user?.selectedTrackers || ['calories', 'protein', 'supplements']),
  });

  // Save tracker preferences whenever selectedTrackers changes
  useEffect(() => {
    if (isEditing && formData.selectedTrackers) {
      console.log('FormData selectedTrackers changed:', formData.selectedTrackers);
      saveUserPreferences({ selectedTrackers: formData.selectedTrackers });
    }
  }, [formData.selectedTrackers, isEditing]);

  // Handle URL parameters for auto-editing
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldEdit = params.get('edit') === 'true';
    const focusField = params.get('focus');
    
    if (shouldEdit) {
      setIsEditing(true);
      
      // Focus on specific field if specified
      if (focusField) {
        setTimeout(() => {
          const fieldMap = {
            'calories': 'calories',
            'protein': 'protein', 
            'carbs': 'carbs',
            'fat': 'fat',
            'hydration': 'hydration',
            'supplements': 'supplements'
          };
          
          const fieldId = fieldMap[focusField];
          if (fieldId) {
            const element = document.getElementById(fieldId);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.focus();
            }
          }
        }, 100);
      }
    }
  }, [location]);

  const handleSave = async () => {
    console.log('[DEBUG] Profile: Starting save process...');
    console.log('[DEBUG] Profile: Form data:', {
      first_name: formData.first_name,
      user_id: user?.id,
      trackers: formData.selectedTrackers
    });
    
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated.",
        variant: "destructive"
      });
      return;
    }

    // Phase 4: Enhanced loading state
    const loadingToast = toast({
      title: "Saving...",
      description: "Updating your profile",
    });
    
    try {
      // Phase 1: Enhanced database save with upsert and verification
      console.log('[DEBUG] Profile: Upserting profile with first_name:', formData.first_name);
      
      const { data: updatedProfile, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          first_name: formData.first_name,
          updated_at: new Date().toISOString()
        })
        .select('first_name, user_id')
        .single();
      
      if (error) {
        console.error('[ERROR] Profile: Database upsert failed:', error);
        toast({
          title: "Error",
          description: `Failed to save profile: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
      
      // Phase 1: Verify the data was actually saved
      console.log('[DEBUG] Profile: Database save verified:', updatedProfile);
      
      if (!updatedProfile || updatedProfile.first_name !== formData.first_name) {
        console.error('[ERROR] Profile: Data verification failed - name not saved correctly');
        toast({
          title: "Error",
          description: "Profile save verification failed. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('[DEBUG] Profile: Database save successful and verified');
      
      // Phase 4: Immediate local context update for instant UI feedback
      updateProfile({
        first_name: formData.first_name,
        targetCalories: Number(formData.targetCalories),
        targetProtein: Number(formData.targetProtein),
        targetCarbs: Number(formData.targetCarbs),
        targetFat: Number(formData.targetFat),
        targetHydration: Number(formData.targetHydration),
        targetSupplements: Number(formData.targetSupplements),
        allergies: formData.allergies.split(',').map(a => a.trim()).filter(a => a),
        dietaryGoals: formData.dietaryGoals,
      });
      
      // Update selected trackers
      await updateSelectedTrackers(formData.selectedTrackers);
      
      // Phase 2: Enhanced refresh with timeout protection
      console.log('[DEBUG] Profile: Refreshing user context...');
      
      const refreshTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Refresh timeout')), 10000)
      );
      
      try {
        await Promise.race([refreshUser(), refreshTimeout]);
        
        // Phase 2: Verify refresh worked
        console.log('[DEBUG] Profile: Post-refresh user data:', {
          first_name: user?.first_name,
          context_updated: true
        });
        
      } catch (refreshError) {
        console.warn('[WARN] Profile: Refresh failed but continuing:', refreshError);
        // Continue even if refresh fails - local context is already updated
      }
      
      // Phase 4: Enhanced success feedback
      setIsEditing(false);
      toast({
        title: "✅ Profile updated!",
        description: `Display name saved as "${formData.first_name}"`,
      });
      
      console.log('[DEBUG] Profile: Save process completed successfully');
      
    } catch (error) {
      console.error('[ERROR] Profile: Save process failed:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving your profile.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    const originalTrackers = user?.selectedTrackers || ['calories', 'protein', 'supplements'];
    setUserSelectedTrackers(originalTrackers);
    setFormData({
      first_name: user?.first_name || '',
      email: user?.email || '',
      targetCalories: user?.targetCalories || 2000,
      targetProtein: user?.targetProtein || 150,
      targetCarbs: user?.targetCarbs || 200,
      targetFat: user?.targetFat || 65,
      targetHydration: user?.targetHydration || 8,
      targetSupplements: user?.targetSupplements || 3,
      allergies: user?.allergies?.join(', ') || '',
      dietaryGoals: user?.dietaryGoals || [],
      selectedTrackers: getAutoFilledTrackers(originalTrackers),
    });
  };

  const toggleDietaryGoal = (goalId: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryGoals: prev.dietaryGoals.includes(goalId)
        ? prev.dietaryGoals.filter(g => g !== goalId)
        : [...prev.dietaryGoals, goalId]
    }));
  };

  const toggleTracker = (trackerId: string) => {
    const isUserSelected = userSelectedTrackers.includes(trackerId);
    
    console.log('toggleTracker called:', trackerId, 'user selected:', isUserSelected);
    
    let newUserSelectedTrackers;
    if (isUserSelected) {
      // Remove from user selection
      newUserSelectedTrackers = userSelectedTrackers.filter(t => t !== trackerId);
    } else {
      // Add to user selection
      newUserSelectedTrackers = [...userSelectedTrackers, trackerId];
    }
    
    // Auto-fill to ensure exactly 3 trackers
    const autoFilledTrackers = getAutoFilledTrackers(newUserSelectedTrackers);
    
    console.log('New user selected:', newUserSelectedTrackers);
    console.log('Auto-filled result:', autoFilledTrackers);
    
    setUserSelectedTrackers(newUserSelectedTrackers);
    setFormData(prev => ({
      ...prev,
      selectedTrackers: autoFilledTrackers
    }));
  };

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleStartOnboarding = () => {
    setShowOnboarding(true);
  };

  // Handle onboarding completion
  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    setShowHealthSettings(false);
    
    // Recalculate daily nutrition targets
    if (user?.id) {
      try {
        await supabase.functions.invoke('calculate-daily-targets', {
          body: { userId: user.id }
        });
        
        toast({
          title: "Goals Updated! 🎯",
          description: "Your daily nutrition targets have been recalculated based on your latest health info.",
          duration: 5000,
        });
      } catch (error) {
        console.error('Error recalculating targets:', error);
        toast({
          title: "Settings Updated",
          description: "Your health settings have been saved successfully.",
          duration: 3000,
        });
      }
    }
  };
  
  // Handle health settings update
  const handleUpdateHealthSettings = () => {
    setShowHealthSettings(true);
    setShowOnboarding(true);
  };

  if (showOnboarding || showHealthSettings) {
    return (
      <OnboardingScreen 
        onComplete={handleOnboardingComplete} 
      />
    );
  }

  return (
    <div className={`space-y-4 sm:space-y-6 animate-fade-in ${isMobile ? 'pb-8' : ''}`}>
      {/* Page Title - At the very top */}
      <div className="text-center">
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2`}>Profile & Settings</h1>
        <p className={`text-emerald-600 dark:text-emerald-400 font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>Manage your account and nutrition goals</p>
      </div>

      {/* Avatar Hero Card */}
      <AvatarHeroCard user={user} />

      {/* Personal Information - Moved directly below avatar */}
      <PersonalInformation 
        formData={formData}
        user={user}
        isEditing={isEditing}
        onFormDataChange={updateFormData}
        onEditToggle={() => setIsEditing(!isEditing)}
      />

      {/* Onboarding Completion Card - Show if onboarding not completed */}
      <OnboardingCompletionCard onStartOnboarding={handleStartOnboarding} />

        {/* Streak Badges Section */}
        <StreakBadgesSection />

        {/* Social Follow Stats */}
        <FollowStatsCard 
          userId={user?.id}
          followersCount={0}
          followingCount={0}
          isCurrentUser={true}
        />

        {/* Contact Sync & Friends */}
        <ContactSync />

      {/* Nutrition Goals */}
      <NutritionGoals 
        formData={formData}
        isEditing={isEditing}
        onFormDataChange={updateFormData}
        onEditToggle={() => setIsEditing(!isEditing)}
      />

      {/* Dietary Goals */}
      <DietaryGoals 
        dietaryGoals={formData.dietaryGoals}
        isEditing={isEditing}
        onToggleGoal={toggleDietaryGoal}
        onEditToggle={() => setIsEditing(!isEditing)}
      />

      {/* Allergies */}
      <AllergiesSection 
        allergies={formData.allergies}
        isEditing={isEditing}
        onAllergiesChange={(allergies) => updateFormData({ allergies })}
        onEditToggle={() => setIsEditing(!isEditing)}
      />

      {/* Admin: Backfill Targets for All Users */}
      {user?.email === 'ashkan_e2000@yahoo.com' && (
        <div className="space-y-4">
          <BackfillTargetsButton />
          <TargetsTestButton />
          <DailyTargetsTestSuite />
          <NutritionTargetsTestComponent />
          
          {/* Mood Logging Test Component */}
          <MoodLogTester />
          
          {/* Sound System Test Component */}
          <SoundTestComponent />
        </div>
      )}

      {/* Tracker Selection */}
      <TrackerSelection 
        selectedTrackers={formData.selectedTrackers}
        userSelectedTrackers={userSelectedTrackers}
        isEditing={isEditing}
        onToggleTracker={toggleTracker}
        onEditToggle={() => setIsEditing(!isEditing)}
      />

      {/* Health & Goal Settings */}
      <HealthGoalSettings
        onUpdateSettings={handleUpdateHealthSettings}
        lastUpdated={user?.updated_at}
      />

      {/* Notification Settings */}
      <NotificationSettings />

      {/* Global Barcode Settings */}
      <GlobalBarcodeSettings 
        isEditing={isEditing}
        onEditToggle={() => setIsEditing(!isEditing)}
      />

      {/* Reminder Management */}
      <ReminderManagement />

      {/* Action Buttons */}
      <ProfileActions 
        isEditing={isEditing}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      {/* Logout */}
      <LogoutSection onLogout={logout} />
    </div>
  );
};
