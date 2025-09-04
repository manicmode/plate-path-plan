import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Clock, Zap } from 'lucide-react';
import { useSavedIndividualLogs } from '@/hooks/useSavedIndividualLogs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SavedLogsMealsProps {
  searchTerm: string;
}

export const SavedLogsMeals: React.FC<SavedLogsMealsProps> = ({ searchTerm }) => {
  const { logs, loading, error, relogItem } = useSavedIndividualLogs();
  const { toast } = useToast();

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;
    return logs.filter(log =>
      log.food_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.brand?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  const handleRelogItem = async (log: any) => {
    const success = await relogItem(log);
    if (success) {
      toast({
        title: "Item logged!",
        description: `${log.food_name} has been added to your nutrition log`,
      });
    } else {
      toast({
        title: "Failed to log item",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading your saved logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive mb-2">Error loading logs</div>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (filteredLogs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-2">
          {searchTerm ? 'No matching logs found' : 'No individual meal logs yet'}
        </div>
        <p className="text-sm text-muted-foreground">
          {searchTerm 
            ? 'Try adjusting your search terms'
            : 'Start logging individual meals to see them here'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredLogs.map((log) => (
        <Card key={log.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium truncate">{log.food_name}</h3>
                  {log.brand && (
                    <Badge variant="outline" className="text-xs">
                      {log.brand}
                    </Badge>
                  )}
                  {log.source === 'barcode' && (
                    <Badge variant="secondary" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Barcode
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground mb-2">
                  {log.calories && (
                    <div>
                      <span className="font-medium">{log.calories}</span> kcal
                    </div>
                  )}
                  {log.protein && (
                    <div>
                      <span className="font-medium">{log.protein}g</span> protein
                    </div>
                  )}
                  {log.carbs && (
                    <div>
                      <span className="font-medium">{log.carbs}g</span> carbs
                    </div>
                  )}
                  {log.fat && (
                    <div>
                      <span className="font-medium">{log.fat}g</span> fat
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(log.created_at), 'MMM d, yyyy')}
                  </div>
                  {log.serving_size && (
                    <div>Serving: {log.serving_size}</div>
                  )}
                  {log.confidence && (
                    <div>Confidence: {log.confidence}%</div>
                  )}
                </div>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRelogItem(log)}
                className="ml-4 shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Log Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};