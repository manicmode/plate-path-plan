import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock } from 'lucide-react';
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
      {/* Header with back button and RECENT title */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-primary">RECENT</h1>
        </div>
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