import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { RecentMealsTab } from './RecentMealsTab';
import { RecentSetsTab } from './RecentSetsTab';
import { ActivityTemplatesTab } from './ActivityTemplatesTab';

interface UnifiedLoggingTabsProps {
  onFoodSelect: (food: any) => void;
  onBarcodeSelect: (barcode: string) => void;
  onBack: () => void;
}

export const UnifiedLoggingTabs = ({ onFoodSelect, onBarcodeSelect, onBack }: UnifiedLoggingTabsProps) => {
  const [activeTab, setActiveTab] = useState('meal');

  return (
    <div className="w-full">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-4">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Triple Toggle Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="meal">MEAL</TabsTrigger>
          <TabsTrigger value="set">SET</TabsTrigger>
          <TabsTrigger value="activity">ACTIVITY</TabsTrigger>
        </TabsList>

        <TabsContent value="meal" className="mt-4">
          <RecentMealsTab 
            onFoodSelect={onFoodSelect}
            onBarcodeSelect={onBarcodeSelect}
          />
        </TabsContent>

        <TabsContent value="set" className="mt-4">
          <RecentSetsTab />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivityTemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};