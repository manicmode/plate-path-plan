
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { PersonalInformation } from '@/components/profile/PersonalInformation';
import { NutritionGoals } from '@/components/profile/NutritionGoals';
import { DietaryGoals } from '@/components/profile/DietaryGoals';

import { AllergiesSection } from '@/components/profile/AllergiesSection';
import { NotificationSettings } from '@/components/profile/NotificationSettings';
import { ProfileActions } from '@/components/profile/ProfileActions';
import { LogoutSection } from '@/components/profile/LogoutSection';
import { ReminderManagement } from '@/components/reminder/ReminderManagement';
import { GlobalBarcodeSettings } from '@/components/profile/GlobalBarcodeSettings';


const Profile = () => {
  const { user, updateProfile, logout } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  
  // Use the scroll-to-top hook
  useScrollToTop();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    targetCalories: user?.targetCalories || 2000,
    targetProtein: user?.targetProtein || 150,
    targetCarbs: user?.targetCarbs || 200,
    targetFat: user?.targetFat || 65,
    targetHydration: user?.targetHydration || 8,
    targetSupplements: user?.targetSupplements || 3,
    allergies: user?.allergies?.join(', ') || '',
    dietaryGoals: user?.dietaryGoals || [],
  });


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
    updateProfile({
      name: formData.name,
      targetCalories: Number(formData.targetCalories),
      targetProtein: Number(formData.targetProtein),
      targetCarbs: Number(formData.targetCarbs),
      targetFat: Number(formData.targetFat),
      targetHydration: Number(formData.targetHydration),
      targetSupplements: Number(formData.targetSupplements),
      allergies: formData.allergies.split(',').map(a => a.trim()).filter(a => a),
      dietaryGoals: formData.dietaryGoals,
    });
    
    setIsEditing(false);
    toast.success('Profile updated successfully!');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      targetCalories: user?.targetCalories || 2000,
      targetProtein: user?.targetProtein || 150,
      targetCarbs: user?.targetCarbs || 200,
      targetFat: user?.targetFat || 65,
      targetHydration: user?.targetHydration || 8,
      targetSupplements: user?.targetSupplements || 3,
      allergies: user?.allergies?.join(', ') || '',
      dietaryGoals: user?.dietaryGoals || [],
      
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


  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className={`space-y-4 sm:space-y-6 animate-fade-in ${isMobile ? 'pb-8' : ''}`}>
      {/* Page Title - Properly spaced from header */}
      <div className="text-center">
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2`}>Profile & Settings</h1>
        <p className={`text-emerald-600 dark:text-emerald-400 font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>Manage your account and nutrition goals</p>
      </div>

      {/* Profile Header */}
      <Card className="animate-slide-up glass-card border-0 rounded-3xl">
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <ProfileHeader 
            user={user} 
            isEditing={isEditing} 
            onEditToggle={() => setIsEditing(!isEditing)} 
          />
        </CardContent>
      </Card>

      {/* Personal Information */}
      <PersonalInformation 
        formData={formData}
        isEditing={isEditing}
        onFormDataChange={updateFormData}
        onEditToggle={() => setIsEditing(!isEditing)}
      />

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


      {/* Notification Settings */}
      <NotificationSettings />

      {/* Global Barcode Settings */}
      <GlobalBarcodeSettings 
        isEditing={isEditing}
        onEditToggle={() => setIsEditing(!isEditing)}
      />

      {/* Reminder Management */}
      <ReminderManagement />

      {/* Allergies & Restrictions */}
      <AllergiesSection 
        allergies={formData.allergies}
        isEditing={isEditing}
        onAllergiesChange={(allergies) => updateFormData({ allergies })}
        onEditToggle={() => setIsEditing(!isEditing)}
      />

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

export default Profile;
