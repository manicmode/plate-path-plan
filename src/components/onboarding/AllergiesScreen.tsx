import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';

interface AllergiesScreenProps {
  formData: OnboardingData;
  updateFormData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip: () => void;
}

const commonAllergens = [
  'milk', 'eggs', 'fish', 'shellfish', 'tree_nuts', 'peanuts', 'wheat', 'soy', 
  'sesame', 'corn', 'tomatoes', 'chocolate', 'strawberries', 'citrus'
];

const severityLevels = [
  { value: 'mild', label: 'Mild (discomfort, bloating)' },
  { value: 'moderate', label: 'Moderate (digestive issues, skin reactions)' },
  { value: 'severe', label: 'Severe (difficulty breathing, medical emergency)' },
];

export const AllergiesScreen = ({ formData, updateFormData, onNext, onSkip }: AllergiesScreenProps) => {
  const updateAllergy = (allergen: string, severity: string) => {
    const newAllergies = { ...formData.foodAllergies };
    if (severity) {
      newAllergies[allergen] = severity;
    } else {
      delete newAllergies[allergen];
    }
    updateFormData({ foodAllergies: newAllergies });
  };

  const hasAllergies = Object.keys(formData.foodAllergies).length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Do you have any food allergies or intolerances?
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          This ensures all our recommendations are safe for you and helps us flag potential issues
        </p>
      </div>

      <div className="space-y-6">
        {/* Common Allergens */}
        <div>
          <Label className="text-base font-medium mb-4 block">Common allergens & intolerances:</Label>
          <div className="space-y-3">
            {commonAllergens.map((allergen) => (
              <div key={allergen} className={`flex items-center space-x-4 p-4 rounded-lg glass-button transition-all duration-200 ${
                formData.foodAllergies[allergen] 
                  ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.02]' 
                  : 'border border-border hover:border-green-400 hover:bg-muted/50'
              }`}>
                <div className="flex-1">
                  <Label className="text-base capitalize">{allergen.replace('_', ' ')}</Label>
                </div>
                <div className="w-48">
                  <Select
                    value={formData.foodAllergies[allergen] || ''}
                    onValueChange={(value) => updateAllergy(allergen, value)}
                  >
                    <SelectTrigger className="glass-button border-0">
                      <SelectValue placeholder="Not allergic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not allergic</SelectItem>
                      {severityLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-contamination sensitivity */}
        {hasAllergies && (
          <div className={`p-4 rounded-lg glass-button transition-all duration-200 ${
            formData.crossContaminationSensitive
              ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.02]' 
              : 'border border-border hover:border-green-400 hover:bg-muted/50'
          }`}>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="crossContamination"
                checked={formData.crossContaminationSensitive}
                onCheckedChange={(checked) => updateFormData({ crossContaminationSensitive: !!checked })}
              />
              <Label htmlFor="crossContamination" className="text-base cursor-pointer">
                I'm sensitive to cross-contamination (trace amounts)
              </Label>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-6">
              We'll be extra careful about products that may contain traces of your allergens
            </p>
          </div>
        )}
      </div>

      <div className="flex space-x-4 pt-6">
        <Button
          variant="outline"
          onClick={onSkip}
          className="flex-1"
        >
          Skip for now
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 gradient-primary"
        >
          Next
        </Button>
      </div>
    </div>
  );
};