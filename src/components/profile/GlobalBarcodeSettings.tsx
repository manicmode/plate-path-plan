import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Globe, Info } from 'lucide-react';
import { toast } from 'sonner';
import { safeGetJSON, safeSetJSON } from '@/lib/safeStorage';
import { withFrozenScroll } from '@/utils/freezeScroll';

interface GlobalBarcodeSettingsProps {
  isEditing: boolean;
  onEditToggle: () => void;
}

export const GlobalBarcodeSettings = ({ isEditing, onEditToggle }: GlobalBarcodeSettingsProps) => {
  const [globalSearchEnabled, setGlobalSearchEnabled] = useState(() => {
    return safeGetJSON('global_barcode_search', true);
  });

  const handleToggle = (enabled: boolean) => {
    setGlobalSearchEnabled(enabled);
    safeSetJSON('global_barcode_search', enabled);
    toast.success(enabled ? 'Global barcode search enabled' : 'Global barcode search disabled');
  };

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl ProfileCard">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
          <Globe className="h-5 w-5 text-emerald-600" />
          Barcode Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Enable Global Barcode Search
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Search international food databases for better product coverage
            </p>
          </div>
          <Switch
            checked={globalSearchEnabled}
            onCheckedChange={handleToggle}
            disabled={!isEditing}
          />
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800 dark:text-blue-300 font-medium mb-1">
                Database Sources
              </p>
              <ul className="text-blue-700 dark:text-blue-300 space-y-1 text-xs">
                <li>• USDA for US products</li>
                <li>• Open Food Facts for international products</li>
                <li>• Regional databases when available</li>
              </ul>
            </div>
          </div>
        </div>
        
        {!isEditing && (
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
withFrozenScroll(() => onEditToggle());
            }}
            className="w-full opacity-70 hover:opacity-100"
            style={{ touchAction: 'manipulation' }}
          >
            Edit Settings
          </Button>
        )}
      </CardContent>
    </Card>
  );
};