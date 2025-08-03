
import React from 'react';
import { BadgeProvider } from '@/contexts/BadgeContext';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { StreakBadgesSection } from '@/components/analytics/StreakBadgesSection';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useLocation } from 'react-router-dom';
import { getDisplayName } from '@/lib/displayName';

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
  
  // ✅ On Profile.tsx page load, print to console what displayName is being loaded
  useEffect(() => {
    if (user) {
      const currentDisplayName = getDisplayName({
        first_name: user.first_name,
        username: undefined,
        email: user.email
      });
      console.log('[DEBUG] Profile Page Load - User loaded with displayName:', {
        displayName: currentDisplayName,
        user_first_name: user.first_name,
        user_email: user.email,
        user_id: user.id
      });
    }
  }, [user]);
  
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
    console.log('[DEBUG] Profile: Form data to save:', {
      first_name: formData.first_name,
      user_id: user?.id,
      current_user_first_name: user?.first_name
    });
    
    if (!user?.id) {
      console.error('[ERROR] Profile: User ID not available');
      toast({
        title: "Error",
        description: "User not authenticated.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.first_name || !formData.first_name.trim()) {
      console.error('[ERROR] Profile: No first_name provided');
      toast({
        title: "Error", 
        description: "Profile name cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    // Loading state
    toast({
      title: "Saving...",
      description: "Updating your profile",
    });
    
    try {
      // ✅ FINAL SAFEGUARD: Force upsert logic to always create or update user_profiles row
      console.log('[DEBUG] Profile: Force upserting user_profiles with:', {
        user_id: user.id,
        first_name: formData.first_name.trim(),
        timestamp: new Date().toISOString()
      });
      
      const { data: upsertedProfile, error: upsertError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          first_name: formData.first_name.trim(),
          updated_at: new Date().toISOString()
        })
        .select('user_id, first_name, updated_at')
        .single();
      
      if (upsertError) {
        console.error('[ERROR] Profile: Upsert failed:', upsertError);
        toast({
          title: "Error",
          description: `Database save failed: ${upsertError.message}`,
          variant: "destructive"
        });
        return;
      }
      
      // ✅ Log right after upsert
      console.log('[DEBUG] Profile: Upsert successful, returned data:', upsertedProfile);
      
      // Verify the upsert worked
      if (!upsertedProfile || upsertedProfile.first_name !== formData.first_name.trim()) {
        console.error('[ERROR] Profile: Upsert verification failed:', {
          expected: formData.first_name.trim(),
          actual: upsertedProfile?.first_name,
          returned_data: upsertedProfile
        });
        toast({
          title: "Error",
          description: "Profile save verification failed. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('[SUCCESS] Profile: Database upsert verified successfully');
      
      // Update local context immediately
      updateProfile({
        first_name: formData.first_name.trim(),
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
      
      // ✅ Refresh user context and verify
      console.log('[DEBUG] Profile: Refreshing user context...');
      await refreshUser();
      
      // ✅ Log right after refreshUser to check if saved name exists in context
      console.log('[DEBUG] Profile: Post-refresh context check:', {
        user_first_name: user?.first_name,
        expected_first_name: formData.first_name.trim(),
        context_matches_saved: user?.first_name === formData.first_name.trim(),
        full_user_context: {
          id: user?.id,
          email: user?.email,
          first_name: user?.first_name
        }
      });
      
      // ✅ Only show success toast if first_name is present in refreshed context
      if (user?.first_name === formData.first_name.trim()) {
        console.log('[SUCCESS] Profile: Context verified, showing success toast');
        setIsEditing(false);
        toast({
          title: "✅ Profile saved!",
          description: `Display name saved as "${formData.first_name.trim()}"`,
        });
      } else {
        console.error('[ERROR] Profile: Context verification failed after refresh');
        toast({
          title: "Warning",
          description: "Profile may not have saved correctly. Please check and try again.",
          variant: "destructive"
        });
      }
      
      console.log('[DEBUG] Profile: Save process completed');
      
    } catch (error) {
      console.error('[ERROR] Profile: Save process exception:', error);
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
