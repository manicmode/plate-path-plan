
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

import ProfileHeader from '@/components/profile/ProfileHeader';
import { PersonalInformation } from '@/components/profile/PersonalInformation';
import { NutritionGoals } from '@/components/profile/NutritionGoals';
import { DietaryGoals } from '@/components/profile/DietaryGoals';
import { TrackerSelection } from '@/components/profile/TrackerSelection';
import { AllergiesSection } from '@/components/profile/AllergiesSection';
import { NotificationSettings } from '@/components/profile/NotificationSettings';
import { MoodCheckinSettings } from '@/components/mood/MoodCheckinSettings';
import { ProfileActions } from '@/components/profile/ProfileActions';
import { LogoutSection } from '@/components/profile/LogoutSection';
import { DailyTargetsCard } from '@/components/profile/DailyTargetsCard';

import { GlobalBarcodeSettings } from '@/components/profile/GlobalBarcodeSettings';
import { OnboardingCompletionCard } from '@/components/profile/OnboardingCompletionCard';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { AvatarHeroCard } from '@/components/profile/AvatarHeroCard';
import { HealthGoalSettings } from '@/components/profile/HealthGoalSettings';
import { ContactSync } from '@/components/profile/ContactSync';
import { FollowStatsCard } from '@/components/social/FollowStatsCard';
import { ReminderManagement } from '@/components/reminder/ReminderManagement';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAutoFilledTrackers } from '@/lib/trackerUtils';
import { withStabilizedViewport } from '@/utils/scrollStabilizer';
const saveUserPreferences = (preferences: any) => {
  try {
    localStorage.setItem('user_preferences', JSON.stringify(preferences));
  } catch (error) {
    // silent
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
  const { user, updateProfile, updateSelectedTrackers, logout } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  
  // Use the scroll-to-top hook
  useScrollToTop();
  
  type ProfileSectionId = "identity" | "targets" | "goals" | "allergies" | "homeDisplay" | "notifications" | "nudges" | "barcode";
  const [editingSection, setEditingSection] = useState<ProfileSectionId | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHealthSettings, setShowHealthSettings] = useState(false);
  const { toast } = useToast();
  const [userSelectedTrackers, setUserSelectedTrackers] = useState<string[]>(
    user?.selectedTrackers || ['calories', 'protein', 'supplements']
  );
  
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
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

  // Keep form data in sync with user changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
      }));
    }
  }, [user?.first_name, user?.last_name, user?.email]);

  // Save tracker preferences whenever selectedTrackers changes
  useEffect(() => {
    if (editingSection !== null && formData.selectedTrackers) {
      saveUserPreferences({ selectedTrackers: formData.selectedTrackers });
    }
  }, [formData.selectedTrackers, editingSection]);

  // Handle URL parameters for auto-editing
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldEdit = params.get('edit') === 'true';
    const focusField = params.get('focus');

    if (shouldEdit) {
      // If focusing a target field, open targets; otherwise open identity by default
      const targetFields = new Set(['calories','protein','carbs','fat','hydration','supplements']);
      const openSection: ProfileSectionId = focusField && targetFields.has(focusField) ? 'targets' : 'identity';
      setEditingSection(openSection);

      if (focusField && targetFields.has(focusField)) {
        setTimeout(() => {
          const element = document.getElementById(focusField);
          if (element) {
            requestAnimationFrame(() => { requestAnimationFrame(() => { element.focus?.({ preventScroll: true }); }); });
          }
        }, 100);
      }
    }
  }, [location]);

  const handleSave = async () => {
    // Update profile in Supabase
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        if (error) {
          console.error('Error updating profile:', error);
          toast({ title: 'Error', description: 'Failed to save profile changes.', variant: 'destructive' });
          return;
        }
      } catch (err) {
        console.error('Error updating profile:', err);
        toast({ title: 'Error', description: 'Failed to save profile changes.', variant: 'destructive' });
        return;
      }
    }

    updateProfile({
      first_name: formData.first_name,
      last_name: formData.last_name,
      targetCalories: Number(formData.targetCalories),
      targetProtein: Number(formData.targetProtein),
      targetCarbs: Number(formData.targetCarbs),
      targetFat: Number(formData.targetFat),
      targetHydration: Number(formData.targetHydration),
      targetSupplements: Number(formData.targetSupplements),
      allergies: formData.allergies.split(',').map(a => a.trim()).filter(Boolean),
      dietaryGoals: formData.dietaryGoals,
    });

    await updateSelectedTrackers(formData.selectedTrackers);

    setEditingSection(null);
    toast({ title: 'Profile Updated!', description: 'Changes will appear on the home page.' });
  };

  const handleCancel = () => {
    setEditingSection(null);
    const originalTrackers = user?.selectedTrackers || ['calories', 'protein', 'supplements'];
    setUserSelectedTrackers(originalTrackers);
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
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


  return (
    <div className={`space-y-4 sm:space-y-6 animate-fade-in ${isMobile ? 'pb-8' : ''} ProfilePageRoot`}>
      {/* Page Title - At the very top */}
      <div className="text-center">
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2`}>Profile & Settings</h1>
        <p className={`text-emerald-600 dark:text-emerald-400 font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>Manage your account and nutrition goals</p>
      </div>

      {/* Avatar Hero Card */}
      <AvatarHeroCard user={user} />
        {!(showOnboarding || showHealthSettings) ? (
          <div className={`ProfileContent ${editingSection ? 'isEditing' : ''}`}>
      {/* Personal Information - Moved directly below avatar */}
      <PersonalInformation 
        formData={formData}
        user={user}
        isEditing={editingSection === 'identity'}
        onFormDataChange={updateFormData}
        onEditToggle={() => withStabilizedViewport(() => setEditingSection(editingSection === 'identity' ? null : 'identity'))}
      />

      {/* Onboarding Completion Card - Show if onboarding not completed */}
<OnboardingCompletionCard onStartOnboarding={() => withStabilizedViewport(() => handleStartOnboarding())} />

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
        isEditing={editingSection === 'targets'}
        onFormDataChange={updateFormData}
        onEditToggle={() => withStabilizedViewport(() => setEditingSection(editingSection === 'targets' ? null : 'targets'))}
      />

      {/* Dietary Goals */}
      <DietaryGoals 
        dietaryGoals={formData.dietaryGoals}
        isEditing={editingSection === 'goals'}
        onToggleGoal={toggleDietaryGoal}
        onEditToggle={() => withStabilizedViewport(() => setEditingSection(editingSection === 'goals' ? null : 'goals'))}
      />

      {/* Allergies */}
      <AllergiesSection 
        allergies={formData.allergies}
        isEditing={editingSection === 'allergies'}
        onAllergiesChange={(allergies) => updateFormData({ allergies })}
        onEditToggle={() => withStabilizedViewport(() => setEditingSection(editingSection === 'allergies' ? null : 'allergies'))}
      />


      {/* Tracker Selection */}
      <TrackerSelection 
        selectedTrackers={formData.selectedTrackers}
        userSelectedTrackers={userSelectedTrackers}
        isEditing={editingSection === 'homeDisplay'}
        onToggleTracker={toggleTracker}
        onEditToggle={() => withStabilizedViewport(() => setEditingSection(editingSection === 'homeDisplay' ? null : 'homeDisplay'))}
      />

      {/* Health & Goal Settings */}
      <HealthGoalSettings
        onUpdateSettings={() => withStabilizedViewport(() => handleUpdateHealthSettings())}
        lastUpdated={user?.updated_at}
      />

      {/* Notification Settings */}
      <NotificationSettings />

      {/* Mood Check-In Settings */}
      <MoodCheckinSettings />

      {/* Global Barcode Settings */}
      <GlobalBarcodeSettings 
        isEditing={editingSection === 'barcode'}
        onEditToggle={() => withStabilizedViewport(() => setEditingSection(editingSection === 'barcode' ? null : 'barcode'))}
      />

      {/* Reminder Management */}
      <ReminderManagement />

      {/* Action Buttons */}
      <ProfileActions 
        isEditing={editingSection !== null}
        onSave={() => withStabilizedViewport(() => handleSave())}
        onCancel={() => withStabilizedViewport(() => handleCancel())}
      />

      {/* Logout */}
        <LogoutSection onLogout={logout} />
          </div>
        ) : (
          <OnboardingScreen 
            onComplete={handleOnboardingComplete} 
          />
        )}
    </div>
  );
};
