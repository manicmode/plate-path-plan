
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface PersonalInformationProps {
  formData: {
    first_name: string;
    last_name: string;
    email: string;
  };
  isEditing: boolean;
  onFormDataChange: (updates: Partial<any>) => void;
  onEditToggle: () => void;
}

export const PersonalInformation = ({ formData, isEditing, onFormDataChange, onEditToggle }: PersonalInformationProps) => {
  const isMobile = useIsMobile();

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '100ms' }}>
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'} flex flex-row items-center justify-between`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <User className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
          <span>Personal Information</span>
        </CardTitle>
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={onEditToggle}
          className="opacity-70 hover:opacity-100"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className={`space-y-3 sm:space-y-4 ${isMobile ? 'p-4' : 'p-6'} pt-0`}>
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
          <div className="space-y-2">
            <Label htmlFor="first_name" className={`${isMobile ? 'text-sm' : 'text-base'}`}>First Name</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => onFormDataChange({ first_name: e.target.value })}
              disabled={!isEditing}
              className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Last Name</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => onFormDataChange({ last_name: e.target.value })}
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
  );
};
