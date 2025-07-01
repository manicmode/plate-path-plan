
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { User, Settings, Target, Heart, Shield, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Profile = () => {
  const { user, updateProfile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    targetCalories: user?.targetCalories || 2000,
    targetProtein: user?.targetProtein || 150,
    targetCarbs: user?.targetCarbs || 200,
    targetFat: user?.targetFat || 65,
    allergies: user?.allergies?.join(', ') || '',
    dietaryGoals: user?.dietaryGoals || [],
  });

  const handleSave = () => {
    updateProfile({
      name: formData.name,
      targetCalories: Number(formData.targetCalories),
      targetProtein: Number(formData.targetProtein),
      targetCarbs: Number(formData.targetCarbs),
      targetFat: Number(formData.targetFat),
      allergies: formData.allergies.split(',').map(a => a.trim()).filter(a => a),
      dietaryGoals: formData.dietaryGoals,
    });
    
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

  const toggleDietaryGoal = (goalId: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryGoals: prev.dietaryGoals.includes(goalId)
        ? prev.dietaryGoals.filter(g => g !== goalId)
        : [...prev.dietaryGoals, goalId]
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2">Profile & Settings</h1>
        <p className="text-emerald-600 dark:text-emerald-400 font-semibold">Manage your account and nutrition goals</p>
      </div>

      {/* Profile Header */}
      <Card className="animate-slide-up">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="text-2xl gradient-primary text-white">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-gray-600">{user?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {user?.dietaryGoals?.map(goal => (
                  <Badge key={goal} variant="secondary">
                    {dietaryGoalOptions.find(opt => opt.id === goal)?.label || goal}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              variant={isEditing ? "default" : "outline"}
              onClick={() => setIsEditing(!isEditing)}
            >
              <Settings className="h-4 w-4 mr-2" />
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-blue-600" />
            <span>Personal Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={formData.email}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nutrition Goals */}
      <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-green-600" />
            <span>Daily Nutrition Targets</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calories">Calories</Label>
              <Input
                id="calories"
                type="number"
                value={formData.targetCalories}
                onChange={(e) => setFormData(prev => ({...prev, targetCalories: Number(e.target.value)}))}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                value={formData.targetProtein}
                onChange={(e) => setFormData(prev => ({...prev, targetProtein: Number(e.target.value)}))}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                value={formData.targetCarbs}
                onChange={(e) => setFormData(prev => ({...prev, targetCarbs: Number(e.target.value)}))}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                value={formData.targetFat}
                onChange={(e) => setFormData(prev => ({...prev, targetFat: Number(e.target.value)}))}
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dietary Goals */}
      <Card className="animate-slide-up" style={{ animationDelay: '300ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-600" />
            <span>Dietary Goals</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {dietaryGoalOptions.map(goal => (
              <Badge
                key={goal.id}
                variant={formData.dietaryGoals.includes(goal.id) ? "default" : "outline"}
                className={`cursor-pointer ${isEditing ? 'hover:bg-green-100' : 'cursor-default'}`}
                onClick={() => isEditing && toggleDietaryGoal(goal.id)}
              >
                {goal.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Allergies & Restrictions */}
      <Card className="animate-slide-up" style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-orange-600" />
            <span>Allergies & Restrictions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="allergies">List your allergies or dietary restrictions</Label>
            <Textarea
              id="allergies"
              placeholder="e.g., nuts, dairy, gluten, shellfish"
              value={formData.allergies}
              onChange={(e) => setFormData(prev => ({...prev, allergies: e.target.value}))}
              disabled={!isEditing}
              rows={3}
            />
            <p className="text-sm text-gray-500">Separate multiple items with commas</p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex space-x-3 animate-slide-up" style={{ animationDelay: '500ms' }}>
          <Button onClick={handleSave} className="flex-1 gradient-primary">
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
                allergies: user?.allergies?.join(', ') || '',
                dietaryGoals: user?.dietaryGoals || [],
              });
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Logout */}
      <Card className="animate-slide-up" style={{ animationDelay: '600ms' }}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-red-600">Sign Out</h3>
              <p className="text-sm text-gray-600">Sign out of your NutriCoach account</p>
            </div>
            <Button variant="outline" onClick={logout} className="text-red-600 border-red-200 hover:bg-red-50">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
