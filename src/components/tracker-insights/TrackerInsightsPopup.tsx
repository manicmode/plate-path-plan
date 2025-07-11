import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrackerChart } from './TrackerChart';
import { useTrackerHistoricalData } from './hooks/useTrackerHistoricalData';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrackerInsightsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  trackerType: string;
  trackerName: string;
  trackerColor: string;
}

export const TrackerInsightsPopup = ({ 
  isOpen, 
  onClose, 
  trackerType, 
  trackerName, 
  trackerColor 
}: TrackerInsightsPopupProps) => {
  const [selectedView, setSelectedView] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const { data, loading, error } = useTrackerHistoricalData(trackerType, selectedView);

  const getChartTitle = () => `${trackerName} Insights`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl w-[90vw] max-h-[80vh] overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {getChartTitle()}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-muted rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* View Toggle Tabs */}
          <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="DAY" className="text-sm font-medium">
                DAY
              </TabsTrigger>
              <TabsTrigger value="WEEK" className="text-sm font-medium">
                WEEK
              </TabsTrigger>
              <TabsTrigger value="MONTH" className="text-sm font-medium">
                MONTH
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="DAY" className="mt-0">
                <TrackerChart
                  data={data}
                  loading={loading}
                  error={error}
                  viewType="DAY"
                  trackerColor={trackerColor}
                  trackerName={trackerName}
                />
              </TabsContent>

              <TabsContent value="WEEK" className="mt-0">
                <TrackerChart
                  data={data}
                  loading={loading}
                  error={error}
                  viewType="WEEK"
                  trackerColor={trackerColor}
                  trackerName={trackerName}
                />
              </TabsContent>

              <TabsContent value="MONTH" className="mt-0">
                <TrackerChart
                  data={data}
                  loading={loading}
                  error={error}
                  viewType="MONTH"
                  trackerColor={trackerColor}
                  trackerName={trackerName}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};