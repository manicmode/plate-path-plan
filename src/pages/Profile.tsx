
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { User, Settings, Target, Heart, Shield, LogOut, Monitor } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

const Profile = () => {
  const { user, updateProfile, updateSelectedTrackers, logout } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
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
    selectedTrackers: user?.selectedTrackers || ['calories', 'hydration', 'supplements'],
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
    
    // Update selected trackers
    await updateSelectedTrackers(formData.selectedTrackers);
    
    setIsEditing(false);
    toast.success('Profile updated successfully!');
  };

  const dietaryGoalOptions = [
    { id: 'weight_loss', label: 'Weight Loss' },
    { id: 'muscle_gain', label: 'Muscle Gain' },
    { id: 'maintenance', label: 'Weight Maintenance' },
    { id: 'endurance', label: 'Endurance Training' },
    { id: 'general_health', label: 'General Health' },
  ];

  const trackerOptions = [
    { id: 'calories', label: 'Calories' },
    { id: 'protein', label: 'Protein' },
    { id: 'carbs', label: 'Carbs' },
    { id: 'fat', label: 'Fat' },
    { id: 'hydration', label: 'Hydration' },
    { id: 'supplements', label: 'Supplements' },
  ];

  const toggleDietaryGoal = (goalId: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryGoals: prev.dietaryGoals.includes(goalId)
        ? prev.dietaryGoals.filter(g => g !== goalId)
        : [...prev.dietaryGoals, goalId]
    }));
  };

  const toggleTracker = (trackerId: string) => {
    if (!isEditing) return;
    
    setFormData(prev => {
      const currentTrackers = prev.selectedTrackers;
      const isSelected = currentTrackers.includes(trackerId);
      
      if (isSelected) {
        // Remove tracker
        return {
          ...prev,
          selectedTrackers: currentTrackers.filter(t => t !== trackerId)
        };
      } else {
        // Add tracker if less than 3 selected
        if (currentTrackers.length < 3) {
          return {
            ...prev,
            selectedTrackers: [...currentTrackers, trackerId]
          };
        } else {
          toast.error('You can only select 3 trackers');
          return prev;
        }
      }
    });
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
          <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
            <Avatar className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'}`}>
              <AvatarFallback className={`${isMobile ? 'text-xl' : 'text-2xl'} gradient-primary text-white`}>
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-900 dark:text-white truncate`}>{user?.name}</h2>
              <p className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'} truncate`}>{user?.email}</p>
              <div className={`flex flex-wrap gap-1 sm:gap-2 mt-2`}>
                {user?.dietaryGoals?.slice(0, isMobile ? 2 : 5).map(goal => (
                  <Badge key={goal} variant="secondary" className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {dietaryGoalOptions.find(opt => opt.id === goal)?.label || goal}
                  </Badge>
                ))}
                {isMobile && user?.dietaryGoals && user.dietaryGoals.length > 2 && (
                  <Badge variant="outline" className="text-xs">+{user.dietaryGoals.length - 2}</Badge>
                )}
              </div>
            </div>
            <Button
              variant={isEditing ? "default" : "outline"}
              onClick={() => setIsEditing(!isEditing)}
              size={isMobile ? "sm" : "default"}
              className={isMobile ? 'px-3' : ''}
            >
              <Settings className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? '' : 'mr-2'}`} />
              {!isMobile && (isEditing ? 'Cancel' : 'Edit')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '100ms' }}>
        <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <User className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
            <span>Personal Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={`space-y-3 sm:space-y-4 ${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
            <div className="space-y-2">
              <Label htmlFor="name" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                disabled={!isEditing}
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Email</Label>
              <Input
                id="email"
                value={formData.email}
                disabled
                className={`bg-gray-50 dark:bg-gray-800 ${isMobile ? 'h-10' : 'h-12'}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nutrition Goals */}
      <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '200ms' }}>
        <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Target className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-green-600`} />
            <span>Daily Nutrition Targets</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={`space-y-3 sm:space-y-4 ${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-3 gap-4'}`}>
            <div className="space-y-2">
              <Label htmlFor="calories" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Calories</Label>
              <Input
                id="calories"
                type="number"
                value={formData.targetCalories}
                onChange={(e) => setFormData(prev => ({...prev, targetCalories: Number(e.target.value)}))}
                disabled={!isEditing}
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                value={formData.targetProtein}
                onChange={(e) => setFormData(prev => ({...prev, targetProtein: Number(e.target.value)}))}
                disabled={!isEditing}
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                value={formData.targetCarbs}
                onChange={(e) => setFormData(prev => ({...prev, targetCarbs: Number(e.target.value)}))}
                disabled={!isEditing}
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                value={formData.targetFat}
                onChange={(e) => setFormData(prev => ({...prev, targetFat: Number(e.target.value)}))}
                disabled={!isEditing}
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hydration" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Hydration (glasses)</Label>
              <Input
                id="hydration"
                type="number"
                value={formData.targetHydration}
                onChange={(e) => setFormData(prev => ({...prev, targetHydration: Number(e.target.value)}))}
                disabled={!isEditing}
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplements" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Supplements (count)</Label>
              <Input
                id="supplements"
                type="number"
                value={formData.targetSupplements}
                onChange={(e) => setFormData(prev => ({...prev, targetSupplements: Number(e.target.value)}))}
                disabled={!isEditing}
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dietary Goals */}
      <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '300ms' }}>
        <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Heart className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-red-600`} />
            <span>Dietary Goals</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          <div className={`flex flex-wrap ${isMobile ? 'gap-1' : 'gap-2'}`}>
            {dietaryGoalOptions.map(goal => (
              <Badge
                key={goal.id}
                variant={formData.dietaryGoals.includes(goal.id) ? "default" : "outline"}
                className={`cursor-pointer ${isEditing ? 'hover:bg-green-100' : 'cursor-default'} ${isMobile ? 'text-xs px-2 py-1' : 'text-sm'}`}
                onClick={() => isEditing && toggleDietaryGoal(goal.id)}
              >
                {goal.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Home Page Display */}
      <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '350ms' }}>
        <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Monitor className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-emerald-600`} />
            <span>Home Page Display</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          <div className="space-y-3">
            <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-300`}>
              Choose which 3 trackers appear on your home page ({formData.selectedTrackers.length}/3 selected)
            </p>
            <div className={`flex flex-wrap ${isMobile ? 'gap-1' : 'gap-2'}`}>
              {trackerOptions.map(tracker => (
                <Badge
                  key={tracker.id}
                  variant={formData.selectedTrackers.includes(tracker.id) ? "default" : "outline"}
                  className={`cursor-pointer ${isEditing ? 'hover:bg-green-100' : 'cursor-default'} ${isMobile ? 'text-xs px-2 py-1' : 'text-sm'}`}
                  onClick={() => toggleTracker(tracker.id)}
                >
                  {tracker.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allergies & Restrictions */}
      <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '400ms' }}>
        <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Shield className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-600`} />
            <span>Allergies & Restrictions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          <div className="space-y-2">
            <Label htmlFor="allergies" className={`${isMobile ? 'text-sm' : 'text-base'}`}>List your allergies or dietary restrictions</Label>
            <Textarea
              id="allergies"
              placeholder="e.g., nuts, dairy, gluten, shellfish"
              value={formData.allergies}
              onChange={(e) => setFormData(prev => ({...prev, allergies: e.target.value}))}
              disabled={!isEditing}
              rows={isMobile ? 2 : 3}
              className="glass-button border-0"
            />
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>Separate multiple items with commas</p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {isEditing && (
        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'space-x-3'} animate-slide-up`} style={{ animationDelay: '500ms' }}>
          <Button onClick={handleSave} className={`${isMobile ? 'w-full h-12' : 'flex-1'} gradient-primary`}>
            Save Changes
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
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
                selectedTrackers: user?.selectedTrackers || ['calories', 'hydration', 'supplements'],
              });
            }}
            className={`${isMobile ? 'w-full h-12' : ''} glass-button border-0`}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Logout */}
      <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '600ms' }}>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`flex items-center ${isMobile ? 'flex-col space-y-3' : 'justify-between'}`}>
            <div className={`${isMobile ? 'text-center' : ''}`}>
              <h3 className={`font-semibold text-red-600 ${isMobile ? 'text-base' : 'text-lg'}`}>Sign Out</h3>
              <p className={`${isMobile ? 'text-sm' : 'text-sm'} text-gray-600 dark:text-gray-300`}>Sign out of your NutriCoach account</p>
            </div>
            <Button 
              variant="outline" 
              onClick={logout} 
              className={`text-red-600 border-red-200 hover:bg-red-50 ${isMobile ? 'w-full h-12' : ''}`}
            >
              <LogOut className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'} mr-2`} />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
