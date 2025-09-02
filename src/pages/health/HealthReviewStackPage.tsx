import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface HealthReviewItem {
  id: string;
  name: string;
  status: 'pending' | 'loading' | 'ready' | 'error';
  healthData?: any;
  error?: string;
}

export default function HealthReviewStackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<HealthReviewItem[]>([]);
  
  // Initialize items from URL params or storage
  useEffect(() => {
    const itemsParam = searchParams.get('items');
    if (itemsParam) {
      try {
        const parsedItems = JSON.parse(decodeURIComponent(itemsParam));
        const reviewItems = parsedItems.map((item: any, index: number) => ({
          id: `health-${index}`,
          name: item.name || item,
          status: 'pending' as const
        }));
        setItems(reviewItems);
      } catch (error) {
        console.error('[HEALTH_REVIEW] Failed to parse items:', error);
        toast.error('Failed to load items for health review');
        navigate('/scan');
      }
    } else {
      // No items, redirect back to scan
      navigate('/scan');
    }
  }, [searchParams, navigate]);

  // Process health reports for items
  useEffect(() => {
    const processHealthReports = async () => {
      const pendingItems = items.filter(item => item.status === 'pending');
      if (pendingItems.length === 0) return;

      // Process up to 2 items at a time
      const toProcess = pendingItems.slice(0, 2);
      
      for (const item of toProcess) {
        setItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, status: 'loading' } : i
        ));

        try {
          // Mock health check call - replace with actual edge function call
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Simulate health data
          const mockHealthData = {
            healthScore: Math.floor(Math.random() * 100),
            benefits: [`Good source of nutrients for ${item.name}`],
            concerns: [],
            recommendations: [`Consider portion size for ${item.name}`]
          };

          setItems(prev => prev.map(i => 
            i.id === item.id 
              ? { ...i, status: 'ready', healthData: mockHealthData }
              : i
          ));
        } catch (error) {
          console.error(`[HEALTH_REVIEW] Error processing ${item.name}:`, error);
          setItems(prev => prev.map(i => 
            i.id === item.id 
              ? { ...i, status: 'error', error: 'Failed to analyze' }
              : i
          ));
        }
      }
    };

    processHealthReports();
  }, [items]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'ready':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-300" />;
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-3"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Health Analysis</h1>
        </div>
      </div>

      {/* Items Stack */}
      <div className="p-4 space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="capitalize">{item.name}</span>
                {getStatusIcon(item.status)}
              </CardTitle>
            </CardHeader>
            
            {item.status === 'loading' && (
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing health impact...
                </div>
              </CardContent>
            )}

            {item.status === 'ready' && item.healthData && (
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Health Score</span>
                  <span className={`text-lg font-bold ${getHealthScoreColor(item.healthData.healthScore)}`}>
                    {item.healthData.healthScore}/100
                  </span>
                </div>
                
                {item.healthData.benefits.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-1">Benefits</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {item.healthData.benefits.map((benefit: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {item.healthData.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-700 mb-1">Recommendations</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {item.healthData.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            )}

            {item.status === 'error' && (
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {item.error || 'Analysis failed'}
                </div>
              </CardContent>
            )}

            {item.status === 'pending' && (
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Waiting to analyze...
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Actions */}
      {items.every(item => ['ready', 'error'].includes(item.status)) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button
            onClick={() => navigate('/scan')}
            className="w-full"
            size="lg"
          >
            Back to Health Scan
          </Button>
        </div>
      )}
    </div>
  );
}