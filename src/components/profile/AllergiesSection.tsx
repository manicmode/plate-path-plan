
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Shield, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface AllergiesSectionProps {
  allergies: string;
  isEditing: boolean;
  onAllergiesChange: (allergies: string) => void;
  onEditToggle: () => void;
}

export const AllergiesSection = ({ allergies, isEditing, onAllergiesChange, onEditToggle }: AllergiesSectionProps) => {
  const isMobile = useIsMobile();

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '400ms' }}>
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'} flex flex-row items-center justify-between`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <Shield className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-600`} />
          <span>Allergies & Restrictions</span>
        </CardTitle>
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEditToggle();
          }}
          className="opacity-70 hover:opacity-100"
          style={{ touchAction: 'manipulation' }}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
        <div className="space-y-2">
          <Label htmlFor="allergies" className={`${isMobile ? 'text-sm' : 'text-base'}`}>List your allergies or dietary restrictions</Label>
          <Textarea
            id="allergies"
            placeholder="e.g., nuts, dairy, gluten, shellfish"
            value={allergies}
            onChange={(e) => onAllergiesChange(e.target.value)}
            disabled={!isEditing}
            rows={isMobile ? 2 : 3}
            className="glass-button border-0"
          />
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>Separate multiple items with commas</p>
        </div>
      </CardContent>
    </Card>
  );
};
