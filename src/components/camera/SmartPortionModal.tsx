import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PortionModalInput {
  item: {
    name: string;
    classId?: string;
    providerRef?: 'generic' | 'brand' | 'vault';
    baseServingG?: number;
    packSizeG?: number;
    servingSizeText?: string;
    brandSizes?: string[];
  };
  enrichedData: {
    ingredientsList: string[];
    nutrition: Record<string, any>;
    servingGrams?: number;
  };
}

interface PortionModalOutput {
  servingG: number;
  unit: string;
  quantity: number;
  confidence: 'high' | 'medium' | 'estimated';
  userConfirmed: true;
}

interface Props {
  input: PortionModalInput;
  onContinue: (output: PortionModalOutput & { [key: string]: any }) => void;
  onCancel: () => void;
}

interface PortionPreset {
  label: string;
  grams: number;
  unit: string;
  quantity: number;
}

interface QuickUnit {
  label: string;
  unit: string;
  gramsPerUnit: number;
}

const getPortionPresetsAndUnits = (classId?: string, name?: string): { presets: PortionPreset[], quickUnits: QuickUnit[] } => {
  const lowerName = name?.toLowerCase() || '';
  const lowerClassId = classId?.toLowerCase() || '';
  
  // Sandwich presets & units
  if (lowerName.includes('sandwich') || lowerClassId.includes('sandwich')) {
    return {
      presets: [
        { label: '½ sandwich', grams: 75, unit: 'half', quantity: 0.5 },
        { label: '1 sandwich', grams: 150, unit: 'whole', quantity: 1 },
        { label: '1½ sandwiches', grams: 225, unit: 'whole', quantity: 1.5 }
      ],
      quickUnits: [
        { label: 'Half', unit: 'half', gramsPerUnit: 75 },
        { label: 'Whole', unit: 'whole', gramsPerUnit: 150 },
        { label: '6-inch', unit: '6-inch', gramsPerUnit: 225 },
        { label: '12-inch', unit: '12-inch', gramsPerUnit: 450 }
      ]
    };
  }
  
  // Beverage presets & units
  if (lowerName.includes('drink') || lowerName.includes('beverage') || lowerName.includes('soda') || 
      lowerName.includes('juice') || lowerName.includes('coffee') || lowerName.includes('tea')) {
    return {
      presets: [
        { label: '1 can', grams: 355, unit: 'can', quantity: 1 },
        { label: '1 bottle', grams: 500, unit: 'bottle', quantity: 1 },
        { label: '1 cup', grams: 240, unit: 'cup', quantity: 1 }
      ],
      quickUnits: [
        { label: 'ml', unit: 'ml', gramsPerUnit: 1 },
        { label: 'fl oz', unit: 'fl oz', gramsPerUnit: 30 },
        { label: 'Can', unit: 'can', gramsPerUnit: 355 },
        { label: 'Bottle', unit: 'bottle', gramsPerUnit: 500 }
      ]
    };
  }
  
  // Cereal presets & units
  if (lowerName.includes('cereal') || lowerName.includes('granola')) {
    return {
      presets: [
        { label: '½ cup', grams: 30, unit: 'cup', quantity: 0.5 },
        { label: '1 cup', grams: 60, unit: 'cup', quantity: 1 },
        { label: '1 bowl', grams: 45, unit: 'bowl', quantity: 1 }
      ],
      quickUnits: [
        { label: 'Cup', unit: 'cup', gramsPerUnit: 60 },
        { label: 'Bowl', unit: 'bowl', gramsPerUnit: 45 },
        { label: 'Grams', unit: 'g', gramsPerUnit: 1 }
      ]
    };
  }
  
  // Bread presets & units
  if (lowerName.includes('bread') || lowerName.includes('toast')) {
    return {
      presets: [
        { label: '1 slice', grams: 28, unit: 'slice', quantity: 1 },
        { label: '2 slices', grams: 56, unit: 'slice', quantity: 2 }
      ],
      quickUnits: [
        { label: 'Slice', unit: 'slice', gramsPerUnit: 28 },
        { label: 'Grams', unit: 'g', gramsPerUnit: 1 }
      ]
    };
  }
  
  // Pizza presets & units
  if (lowerName.includes('pizza')) {
    return {
      presets: [
        { label: '1 slice', grams: 125, unit: 'slice', quantity: 1 },
        { label: '2 slices', grams: 250, unit: 'slice', quantity: 2 },
        { label: 'Personal pizza', grams: 200, unit: 'personal', quantity: 1 }
      ],
      quickUnits: [
        { label: 'Slice', unit: 'slice', gramsPerUnit: 125 },
        { label: 'Personal', unit: 'personal', gramsPerUnit: 200 },
        { label: 'Grams', unit: 'g', gramsPerUnit: 1 }
      ]
    };
  }
  
  // Default presets & units
  return {
    presets: [
      { label: '50g serving', grams: 50, unit: 'g', quantity: 1 },
      { label: '100g serving', grams: 100, unit: 'g', quantity: 1 },
      { label: '150g serving', grams: 150, unit: 'g', quantity: 1 }
    ],
    quickUnits: [
      { label: 'Grams', unit: 'g', gramsPerUnit: 1 },
      { label: 'Serving', unit: 'serving', gramsPerUnit: 100 }
    ]
  };
};

export function SmartPortionModal({ input, onContinue, onCancel }: Props) {
  const defaultServingG = input.enrichedData.servingGrams || input.item.baseServingG || 100;
  const [customGrams, setCustomGrams] = useState(defaultServingG);
  const [selectedPreset, setSelectedPreset] = useState<PortionPreset | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<QuickUnit | null>(null);
  const [unitQuantity, setUnitQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('presets');
  
  const { presets, quickUnits } = useMemo(
    () => getPortionPresetsAndUnits(input.item.classId, input.item.name),
    [input.item.classId, input.item.name]
  );
  
  const finalGrams = useMemo(() => {
    if (activeTab === 'presets' && selectedPreset) {
      return selectedPreset.grams;
    }
    if (activeTab === 'units' && selectedUnit) {
      return Math.round(selectedUnit.gramsPerUnit * unitQuantity);
    }
    return customGrams;
  }, [activeTab, selectedPreset, selectedUnit, unitQuantity, customGrams]);
  
  const confidence: 'high' | 'medium' | 'estimated' = useMemo(() => {
    if (selectedPreset || selectedUnit) return 'high';
    if (customGrams === defaultServingG) return 'medium';
    return 'estimated';
  }, [selectedPreset, selectedUnit, customGrams, defaultServingG]);
  
  const handleContinue = useCallback(() => {
    const output: PortionModalOutput = {
      servingG: finalGrams,
      unit: selectedPreset?.unit || selectedUnit?.unit || 'g',
      quantity: selectedPreset?.quantity || unitQuantity,
      confidence,
      userConfirmed: true
    };
    
    // Merge with enriched data
    const finalData = {
      ...input.enrichedData,
      ...output,
      servingGrams: finalGrams,
      name: input.item.name
    };
    
    onContinue(finalData);
  }, [finalGrams, selectedPreset, selectedUnit, unitQuantity, confidence, input, onContinue]);
  
  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Set Portion Size</h3>
            <p className="text-sm text-muted-foreground">{input.item.name}</p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="presets">Presets</TabsTrigger>
              <TabsTrigger value="units">Units</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
            
            <TabsContent value="presets" className="space-y-3">
              <div className="grid gap-2">
                {presets.map((preset, index) => (
                  <Card 
                    key={index}
                    className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                      selectedPreset?.label === preset.label 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedPreset(preset)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{preset.label}</span>
                      <Badge variant="secondary">{preset.grams}g</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="units" className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {quickUnits.map((unit, index) => (
                  <Button
                    key={index}
                    variant={selectedUnit?.unit === unit.unit ? "default" : "outline"}
                    onClick={() => setSelectedUnit(unit)}
                    className="h-auto p-3 flex flex-col items-center gap-1"
                  >
                    <span className="font-medium">{unit.label}</span>
                    <span className="text-xs opacity-70">{unit.gramsPerUnit}g each</span>
                  </Button>
                ))}
              </div>
              
              {selectedUnit && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Quantity</span>
                    <span className="font-medium">{unitQuantity} {selectedUnit.label.toLowerCase()}</span>
                  </div>
                  <Slider
                    value={[unitQuantity]}
                    onValueChange={(values) => setUnitQuantity(values[0])}
                    min={0.25}
                    max={5}
                    step={0.25}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0.25</span>
                    <span>5</span>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="custom" className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Custom Weight</span>
                  <span className="font-medium">{customGrams}g</span>
                </div>
                <Slider
                  value={[customGrams]}
                  onValueChange={(values) => setCustomGrams(values[0])}
                  min={25}
                  max={500}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>25g</span>
                  <span>500g</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-muted-foreground">Final portion:</span>
              <div className="text-right">
                <div className="font-semibold">{finalGrams}g</div>
                <Badge variant={confidence === 'high' ? 'default' : confidence === 'medium' ? 'secondary' : 'outline'} className="text-xs">
                  {confidence}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={onCancel} 
              variant="outline" 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleContinue} 
              className="flex-1"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}