import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Target, Heart, TrendingUp } from "lucide-react";

interface HealthGoalSettingsProps {
  onUpdateSettings: () => void;
  lastUpdated?: string;
}

export const HealthGoalSettings = ({ onUpdateSettings, lastUpdated }: HealthGoalSettingsProps) => {
  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return "Never updated";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Updated today";
    if (diffDays === 1) return "Updated yesterday";
    if (diffDays < 7) return `Updated ${diffDays} days ago`;
    if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)} weeks ago`;
    return `Updated ${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary/10 p-2">
            <Heart className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg">Health & Goal Settings</CardTitle>
        </div>
        <CardDescription>
          Update your health info, diet preferences, and fitness goals to keep your nutrition targets accurate.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <Target className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Daily Targets</p>
              <p className="text-xs text-muted-foreground">
                {formatLastUpdated(lastUpdated)}
              </p>
            </div>
          </div>
          <TrendingUp className="h-4 w-4 text-success" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="space-y-1">
            <p>• Health conditions</p>
            <p>• Dietary preferences</p>
            <p>• Allergies & restrictions</p>
          </div>
          <div className="space-y-1">
            <p>• Weight goals</p>
            <p>• Activity level</p>
            <p>• Exercise routine</p>
          </div>
        </div>

        <Button 
          onClick={onUpdateSettings} 
          className="w-full"
          variant="outline"
        >
          <Settings className="mr-2 h-4 w-4" />
          Update Health & Goals
        </Button>
      </CardContent>
    </Card>
  );
};