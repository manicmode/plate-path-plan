import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Pill, Plus, X } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';
import { useState } from 'react';

interface SupplementsScreenProps {
  formData: OnboardingData;
  updateFormData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip: () => void;
}

const commonSupplements = [
  'vitamin_d', 'vitamin_b12', 'omega_3', 'magnesium', 'iron', 'calcium',
  'zinc', 'vitamin_c', 'multivitamin', 'probiotics', 'protein_powder', 'creatine'
];

const supplementGoals = [
  { value: 'energy', label: 'Increase energy levels', emoji: '⚡' },
  { value: 'immunity', label: 'Boost immune system', emoji: '🛡️' },
  { value: 'muscle_recovery', label: 'Improve muscle recovery', emoji: '💪' },
  { value: 'bone_health', label: 'Support bone health', emoji: '🦴' },
  { value: 'heart_health', label: 'Support heart health', emoji: '❤️' },
  { value: 'brain_health', label: 'Support brain health', emoji: '🧠' },
  { value: 'sleep_quality', label: 'Improve sleep quality', emoji: '😴' },
  { value: 'stress_management', label: 'Manage stress', emoji: '🧘' },
];

const deficiencyConcerns = [
  { value: 'vitamin_d_deficiency', label: 'Vitamin D deficiency', emoji: '☀️' },
  { value: 'iron_deficiency', label: 'Iron deficiency / anemia', emoji: '🩸' },
  { value: 'b12_deficiency', label: 'B12 deficiency', emoji: '🔋' },
  { value: 'omega_3_low', label: 'Low omega-3 intake', emoji: '🐟' },
  { value: 'calcium_low', label: 'Low calcium intake', emoji: '🥛' },
  { value: 'magnesium_low', label: 'Magnesium deficiency', emoji: '⭐' },
];

export const SupplementsScreen = ({ formData, updateFormData, onNext, onSkip }: SupplementsScreenProps) => {
  const [newSupplement, setNewSupplement] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newFrequency, setNewFrequency] = useState('');

  const addSupplement = () => {
    if (newSupplement && newDosage && newFrequency) {
      const newSupplements = {
        ...formData.currentSupplements,
        [newSupplement]: { dosage: newDosage, frequency: newFrequency }
      };
      updateFormData({ currentSupplements: newSupplements });
      setNewSupplement('');
      setNewDosage('');
      setNewFrequency('');
    }
  };

  const removeSupplement = (supplement: string) => {
    const newSupplements = { ...formData.currentSupplements };
    delete newSupplements[supplement];
    updateFormData({ currentSupplements: newSupplements });
  };

  const toggleGoal = (goal: string) => {
    const current = formData.supplementGoals;
    if (current.includes(goal)) {
      updateFormData({ supplementGoals: current.filter(g => g !== goal) });
    } else {
      updateFormData({ supplementGoals: [...current, goal] });
    }
  };

  const toggleConcern = (concern: string) => {
    const current = formData.deficiencyConcerns;
    if (current.includes(concern)) {
      updateFormData({ deficiencyConcerns: current.filter(c => c !== concern) });
    } else {
      updateFormData({ deficiencyConcerns: [...current, concern] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
            <Pill className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Tell us about supplements
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          We'll avoid redundant recommendations and identify gaps in your current regimen
        </p>
      </div>

      <div className="space-y-6">
        {/* Current Supplements */}
        <div>
          <Label className="text-base font-medium mb-4 block">What supplements do you currently take?</Label>
          
          {/* Add new supplement */}
          <div className="grid grid-cols-12 gap-3 mb-4">
            <div className="col-span-5">
              <Select value={newSupplement} onValueChange={setNewSupplement}>
                <SelectTrigger className="glass-button border-0">
                  <SelectValue placeholder="Select supplement" />
                </SelectTrigger>
                <SelectContent>
                  {commonSupplements.map((supplement) => (
                    <SelectItem key={supplement} value={supplement}>
                      {supplement.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Input
                placeholder="Dosage"
                value={newDosage}
                onChange={(e) => setNewDosage(e.target.value)}
                className="glass-button border-0"
              />
            </div>
            <div className="col-span-3">
              <Select value={newFrequency} onValueChange={setNewFrequency}>
                <SelectTrigger className="glass-button border-0">
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="every_other_day">Every other day</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="as_needed">As needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Button
                onClick={addSupplement}
                disabled={!newSupplement || !newDosage || !newFrequency}
                className="w-full h-full gradient-primary p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Current supplements list */}
          {Object.keys(formData.currentSupplements).length > 0 && (
            <div className="space-y-2">
              {Object.entries(formData.currentSupplements).map(([supplement, details]) => (
                <div key={supplement} className="flex items-center justify-between p-3 rounded-lg glass-button border-0">
                  <div>
                    <span className="font-medium capitalize">{supplement.replace('_', ' ')}</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">
                      {details.dosage} • {details.frequency}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSupplement(supplement)}
                    className="p-1 h-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Supplement Goals */}
        <div>
          <Label className="text-base font-medium mb-4 block">What are your supplement goals?</Label>
          <div className="space-y-3">
            {supplementGoals.map((goal) => (
              <div key={goal.value} className={`flex items-center space-x-3 p-4 rounded-lg glass-button transition-all duration-200 ${
                formData.supplementGoals.includes(goal.value)
                  ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.02]' 
                  : 'border border-border hover:border-green-400 hover:bg-muted/50'
              }`}>
                <Checkbox
                  id={goal.value}
                  checked={formData.supplementGoals.includes(goal.value)}
                  onCheckedChange={() => toggleGoal(goal.value)}
                />
                <Label htmlFor={goal.value} className="flex items-center space-x-3 flex-1 cursor-pointer">
                  <span className="text-xl">{goal.emoji}</span>
                  <span className="text-base">{goal.label}</span>
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Deficiency Concerns */}
        <div>
          <Label className="text-base font-medium mb-4 block">Do you have any known or suspected deficiencies?</Label>
          <div className="space-y-3">
            {deficiencyConcerns.map((concern) => (
              <div key={concern.value} className={`flex items-center space-x-3 p-4 rounded-lg glass-button transition-all duration-200 ${
                formData.deficiencyConcerns.includes(concern.value)
                  ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.02]' 
                  : 'border border-border hover:border-green-400 hover:bg-muted/50'
              }`}>
                <Checkbox
                  id={concern.value}
                  checked={formData.deficiencyConcerns.includes(concern.value)}
                  onCheckedChange={() => toggleConcern(concern.value)}
                />
                <Label htmlFor={concern.value} className="flex items-center space-x-3 flex-1 cursor-pointer">
                  <span className="text-xl">{concern.emoji}</span>
                  <span className="text-base">{concern.label}</span>
                </Label>
              </div>
            ))}
          </div>
        </div>
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