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
}

export const ReviewItemCard: React.FC<ReviewItemCardProps> = ({
  item,
  canRemove = false,
  onChange,
  onRemove
}) => {
  const handleGramsChange = (newGrams: number) => {
    onChange(item.id, 'grams', newGrams);
    // Also update portion for legacy compatibility
    onChange(item.id, 'portion', `${newGrams}g`);
  };

  return (
    <Card className="border border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3 min-w-0">
          <Checkbox
            checked={item.selected}
            onCheckedChange={(checked) => 
              onChange(item.id, 'selected', checked === true)
            }
            className="mt-1 flex-shrink-0"
          />
          
          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Food Name
                </label>
                {item.needsDetails && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Needs details
                  </Badge>
                )}
              </div>
              <Input
                value={item.name}
                onChange={(e) => onChange(item.id, 'name', e.target.value)}
                placeholder="Enter food name..."
                className="w-full"
              />
            </div>
            
            {/* Grams picker - use NumberWheel if enabled, otherwise Input */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                Amount
              </label>
              {FF.FEATURE_NUMBER_WHEEL_PICKERS ? (
                <NumberWheel
                  value={item.grams || 100}
                  onChange={handleGramsChange}
                  min={5}
                  max={1000}
                  step={5}
                  unit="g"
                  className="w-full"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={item.grams || 100}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 100;
                      handleGramsChange(value);
                    }}
                    min={5}
                    max={1000}
                    step={5}
                    placeholder="100"
                    className="text-center"
                  />
                  <span className="text-sm text-muted-foreground">g</span>
                </div>
              )}
            </div>
            
            {/* Legacy portion field for compatibility */}
            {!FF.FEATURE_NUMBER_WHEEL_PICKERS && (
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                  Portion Size
                </label>
                <Input
                  value={item.portion}
                  onChange={(e) => onChange(item.id, 'portion', e.target.value)}
                  placeholder="e.g., 1 cup, 2 slices..."
                />
              </div>
            )}
            
            {/* Egg Size Selector */}
            {item.name.toLowerCase().includes('egg') && (
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                  Egg Size
                </label>
                <Select
                  value={item.eggSize || 'large'}
                  onValueChange={(value) => onChange(item.id, 'eggSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select egg size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (54 kcal)</SelectItem>
                    <SelectItem value="medium">Medium (63 kcal)</SelectItem>
                    <SelectItem value="large">Large (72 kcal)</SelectItem>
                    <SelectItem value="xl">XL (80 kcal)</SelectItem>
                    <SelectItem value="jumbo">Jumbo (90 kcal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {canRemove && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.id)}
              className="mt-1 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};