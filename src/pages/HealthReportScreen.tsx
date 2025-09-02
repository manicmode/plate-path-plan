import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Camera, Edit3, Zap, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { HealthScanItem } from '@/healthscan/orchestrator';

export default function HealthReportScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { items = [], _debug, imageBase64 } = location.state || {};

  const handleLogMeal = () => {
    // Convert health scan items to review items format for prefilling
    const prefilledItems = items.map((item: HealthScanItem, index: number) => ({
      id: `health-scan-${index}`,
      name: item.name,
      portion: item.grams ? `${item.grams}g` : '100g',
      selected: true,
      needsDetails: item.needsDetails,
      mapped: !item.needsDetails,
      grams: item.grams || 100,
      canonicalName: item.canonicalName
    }));

    navigate('/camera', {
      state: {
        prefilledItems,
        source: 'health-report',
        skipCapture: true
      }
    });
  };

  const handleRetakePhoto = () => {
    navigate('/health-scan-photo', { replace: true });
  };

  const handleBack = () => {
    navigate('/scan', { replace: true });
  };

  const getHealthTagColor = (tag: string) => {
    switch (tag) {
      case 'green': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'red': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const totalCalories = items.reduce((sum: number, item: HealthScanItem) => 
    sum + (item.calories || 0), 0
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Health Scan
          </Button>
          <h1 className="font-semibold">Health Report</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/health-scan-photo')}
            className="text-muted-foreground hover:text-foreground"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto p-4 max-w-2xl">
        {/* Summary Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Meal Analysis</h2>
                <p className="text-sm text-muted-foreground">
                  {items.length} item{items.length !== 1 ? 's' : ''} detected
                </p>
              </div>
            </div>
            
            {totalCalories > 0 && (
              <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Math.round(totalCalories)}</div>
                  <div className="text-xs text-muted-foreground">Calories</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Based on detected portions • Add details to refine
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items List */}
        <div className="space-y-3 mb-6">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Detected Items
          </h3>
          
          <div className="space-y-2 max-h-[calc(4*80px)] overflow-y-auto">
            {items.map((item: HealthScanItem, index: number) => (
              <Card key={index} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium capitalize">{item.name}</h4>
                        {item.confidence !== null && (
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(item.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {item.grams && (
                          <span>{item.grams}g</span>
                        )}
                        {item.calories && (
                          <span>{Math.round(item.calories)} cal</span>
                        )}
                        {item.needsDetails && (
                          <Badge variant="outline" className="text-xs">
                            Needs details
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getHealthTagColor(item.healthTag)}`}
                      >
                        {item.healthTag}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <Button
            onClick={handleLogMeal}
            className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold"
            disabled={items.length === 0}
          >
            <Zap className="h-4 w-4 mr-2" />
            Log this Meal
          </Button>
          
          <Button
            onClick={handleRetakePhoto}
            variant="outline"
            className="w-full h-12"
          >
            <Camera className="h-4 w-4 mr-2" />
            Retake Photo
          </Button>
        </div>

        {/* Add bottom spacing for single item scenario */}
        {items.length === 1 && (
          <div className="h-28" />
        )}
      </div>
    </div>
  );
}