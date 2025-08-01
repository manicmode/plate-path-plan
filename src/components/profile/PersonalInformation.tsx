
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, Settings, Camera, RefreshCw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';

interface PersonalInformationProps {
  formData: {
    first_name: string;
    last_name: string;
    email: string;
  };
  user: {
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    dietaryGoals?: string[];
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
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const displayName = formData.first_name && formData.last_name 
    ? `${formData.first_name} ${formData.last_name}`
    : user?.name || user?.email || 'User';

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle avatar upload logic here
      console.log('Avatar upload:', file);
      setAvatarModalOpen(false);
    }
  };

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '100ms' }}>
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar Section */}
          <Dialog open={avatarModalOpen} onOpenChange={setAvatarModalOpen}>
            <DialogTrigger asChild>
              <div className="relative cursor-pointer group">
                <Avatar className={`${isMobile ? 'w-20 h-20' : 'w-24 h-24'} ring-2 ring-primary/20 hover:ring-primary/40 transition-all`}>
                  <AvatarFallback className={`${isMobile ? 'text-2xl' : 'text-3xl'} gradient-primary text-white`}>
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Profile Picture</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Button asChild variant="outline" className="w-full">
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                      <Camera className="h-4 w-4 mr-2" />
                      Choose Photo
                    </label>
                  </Button>
                  <Button variant="secondary" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate AI Avatar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
            onClick={onEditToggle}
            size={isMobile ? "sm" : "default"}
            className="w-fit"
          >
            <Settings className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? '' : 'mr-2'}`} />
            {!isMobile && (isEditing ? 'Cancel' : 'Edit Profile')}
          </Button>
        </div>
      </CardHeader>

      {/* Editable Fields */}
      {isEditing && (
        <CardContent className={`space-y-4 ${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
            <div className="space-y-2">
              <Label htmlFor="first_name" className={`${isMobile ? 'text-sm' : 'text-base'}`}>First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => onFormDataChange({ first_name: e.target.value })}
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => onFormDataChange({ last_name: e.target.value })}
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
                placeholder="Enter last name"
              />
            </div>
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
