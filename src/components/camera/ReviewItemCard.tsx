import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, X } from 'lucide-react';
import { NumberWheel } from '@/components/inputs/NumberWheel';
import { FF } from '@/featureFlags';
import { ReviewItem } from './ReviewItemsScreen';

interface ReviewItemCardProps {
  item: ReviewItem;
  canRemove?: boolean;
  onChange: (id: string, field: 'name' | 'portion' | 'selected' | 'eggSize' | 'grams', value: string | boolean | number) => void;
  onRemove?: (id: string) => void;
  onOpenWheel?: (itemId: string) => void;
}

// Helper function to get display label for portion source
function getPortionSourceLabel(source?: string): string {
  switch (source) {
    case 'count': return 'count';
    case 'area': return 'area';
    case 'base': return 'est';
    case 'heuristic': return 'est';
    default: return 'est';
  }
}

export const ReviewItemCard: React.FC<ReviewItemCardProps> = ({
  item,
  canRemove = false,
  onChange,
  onRemove,
  onOpenWheel
}) => {
  const handleGramsChange = (newGrams: number) => {
    onChange(item.id, 'grams', newGrams);
    // Also update portion for legacy compatibility
    onChange(item.id, 'portion', `${newGrams}g`);
  };

  return (
    <Card className="border border-border bg-card">
      <CardContent className="p-3">
        <div className="flex items-center gap-3 min-w-0">
          <Checkbox
            checked={item.selected}
            onCheckedChange={(checked) => 
              onChange(item.id, 'selected', checked === true)
            }
            className="flex-shrink-0"
          />
          
          <div className="flex-1 min-w-0">
            {/* Title and Amount on same line */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <Input
                value={item.name}
                onChange={(e) => onChange(item.id, 'name', e.target.value)}
                placeholder="Enter food name..."
                className="flex-1 text-sm h-9"
              />
              
              {/* Amount button */}
              <Button
                variant="outline" 
                size="sm"
                onClick={() => onOpenWheel?.(item.id)}
                className="h-9 px-3 text-sm font-medium tabular-nums flex-shrink-0"
              >
                {item.grams || 100}g
              </Button>
            </div>
            
            {/* Secondary info chips */}
            <div className="flex items-center gap-2 text-xs">
              {item.grams && (
                <Badge 
                  variant="secondary" 
                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-1 cursor-pointer hover:bg-emerald-100"
                  onClick={() => onOpenWheel?.(item.id)}
                >
                  ≈{item.grams}g • {getPortionSourceLabel(item.portionSource)}
                </Badge>
              )}
              {item.needsDetails && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1 h-5">
                  <AlertCircle className="h-3 w-3" />
                  Needs details
                </Badge>
              )}
              
              {/* Egg Size Selector as inline chip */}
              {item.name.toLowerCase().includes('egg') && (
                <Select
                  value={item.eggSize || 'large'}
                  onValueChange={(value) => onChange(item.id, 'eggSize', value)}
                >
                  <SelectTrigger className="h-5 text-xs w-auto min-w-20 border-0 bg-muted">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="xl">XL</SelectItem>
                    <SelectItem value="jumbo">Jumbo</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {canRemove && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};