import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PersonalInformation } from '@/components/profile/PersonalInformation';
import { NutritionGoals } from '@/components/profile/NutritionGoals';
import { AllergiesSection } from '@/components/profile/AllergiesSection';
import { DietaryGoals } from '@/components/profile/DietaryGoals';
import { TrackerSelection } from '@/components/profile/TrackerSelection';
import { NotificationSettings } from '@/components/profile/NotificationSettings';
import { LogoutSection } from '@/components/profile/LogoutSection';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileActions } from '@/components/profile/ProfileActions';
import { User, Settings, Target, Bell, Shield } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';

const Profile = () => {
  const { user, updateProfile, updateSelectedTrackers, logout } = useAuth();
  const isMobile = useIsMobile();
  
  // Always scroll to top when entering Profile page
  useScrollToTop(true);

  const [userData, setUserData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    targetCalories: user?.targetCalories || 2000,
    targetProtein: user?.targetProtein || 150,
    targetCarbs: user?.targetCarbs || 200,
    targetFat: user?.targetFat || 65,
    targetHydration: user?.targetHydration || 8,
    targetSupplements: user?.targetSupplements || 3,
    allergies: user?.allergies || [],
    dietaryGoals: user?.dietaryGoals || [],
    selectedTrackers: user?.selectedTrackers || ['calories', 'hydration', 'supplements'],
  });

  useEffect(() => {
    if (user) {
      setUserData({
        name: user.name || '',
        email: user.email || '',
        targetCalories: user.targetCalories || 2000,
        targetProtein: user.targetProtein || 150,
        targetCarbs: user.targetCarbs || 200,
        targetFat: user.targetFat || 65,
        targetHydration: user.targetHydration || 8,
        targetSupplements: user.targetSupplements || 3,
        allergies: user.allergies || [],
        dietaryGoals: user.dietaryGoals || [],
        selectedTrackers: user.selectedTrackers || ['calories', 'hydration', 'supplements'],
      });
    }
  }, [user]);

  const handleProfileUpdate = (updates: Partial<typeof userData>) => {
    const updatedData = { ...userData, ...updates };
    setUserData(updatedData);

    // Optimistically update local state
    updateProfile(updates);

    // Persist changes to AuthContext and Supabase
    updateProfile(updatedData);
  };

  const handleTrackerSelectionUpdate = async (trackers: string[]) => {
    setUserData(prev => ({ ...prev, selectedTrackers: trackers }));
    await updateSelectedTrackers(trackers);
  };

  return (
    <div className={`space-y-6 animate-fade-in ${isMobile ? 'pb-24' : 'pb-32'}`}>
      {/* Profile Header */}
      <ProfileHeader />

      {/* Profile Actions */}
      <ProfileActions />

      {/* Personal Information */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <User className="h-5 w-5 text-blue-500" />
            <span>Personal Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <PersonalInformation
            name={userData.name}
            email={userData.email}
            onUpdate={handleProfileUpdate}
          />
        </CardContent>
      </Card>

      {/* Nutrition Goals */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Target className="h-5 w-5 text-green-500" />
            <span>Nutrition Goals</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <NutritionGoals
            targetCalories={userData.targetCalories}
            targetProtein={userData.targetProtein}
            targetCarbs={userData.targetCarbs}
            targetFat={userData.targetFat}
            targetHydration={userData.targetHydration}
            targetSupplements={userData.targetSupplements}
            onUpdate={handleProfileUpdate}
          />
        </CardContent>
      </Card>

      {/* Allergies Section */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Shield className="h-5 w-5 text-red-500" />
            <span>Allergies</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <AllergiesSection
            allergies={userData.allergies}
            onUpdate={handleProfileUpdate}
          />
        </CardContent>
      </Card>

      {/* Dietary Goals Section */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Settings className="h-5 w-5 text-yellow-500" />
            <span>Dietary Goals</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <DietaryGoals
            dietaryGoals={userData.dietaryGoals}
            onUpdate={handleProfileUpdate}
          />
        </CardContent>
      </Card>

      {/* Tracker Selection */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Settings className="h-5 w-5 text-purple-500" />
            <span>Tracker Selection</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <TrackerSelection
            selectedTrackers={userData.selectedTrackers}
            onUpdate={handleTrackerSelectionUpdate}
          />
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Bell className="h-5 w-5 text-orange-500" />
            <span>Notification Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <NotificationSettings />
        </CardContent>
      </Card>

      {/* Logout Section */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Shield className="h-5 w-5 text-red-500" />
            <span>Account</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <LogoutSection onLogout={logout} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
