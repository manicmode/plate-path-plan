import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pill, Plus, X, Search } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';
import { useState } from 'react';

interface SupplementsScreenProps {
  formData: OnboardingData;
  updateFormData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip: () => void;
}

const comprehensiveSupplements = [
  // Vitamins
  'Vitamin A', 'Vitamin B1 (Thiamine)', 'Vitamin B2 (Riboflavin)', 'Vitamin B3 (Niacin)', 
  'Vitamin B5 (Pantothenic Acid)', 'Vitamin B6', 'Vitamin B7 (Biotin)', 'Vitamin B9 (Folate)', 
  'Vitamin B12', 'Vitamin C', 'Vitamin D3', 'Vitamin E', 'Vitamin K2',
  
  // Minerals
  'Calcium', 'Magnesium', 'Iron', 'Zinc', 'Potassium', 'Selenium', 'Copper', 'Manganese', 
  'Chromium', 'Iodine', 'Molybdenum', 'Boron',
  
  // Omega Fatty Acids
  'Omega-3 (Fish Oil)', 'Omega-3 (Algae)', 'Omega-6', 'Omega-9', 'Krill Oil', 'Cod Liver Oil',
  
  // Amino Acids
  'L-Lysine', 'L-Arginine', 'L-Carnitine', 'L-Glutamine', 'L-Tryptophan', 'L-Tyrosine', 
  'L-Theanine', 'L-Cysteine', 'Taurine', 'Glycine',
  
  // Adaptogens & Herbs
  'Ashwagandha', 'Rhodiola', 'Ginseng', 'Turmeric', 'Ginkgo Biloba', 'Gotu Kola', 
  'Holy Basil', 'Schisandra', 'Maca Root', 'Cordyceps', 'Reishi Mushroom', 
  'Lions Mane Mushroom', 'Chaga Mushroom', 'Turkey Tail Mushroom',
  
  // Performance & Recovery
  'Creatine', 'Protein Powder', 'BCAA', 'Beta-Alanine', 'HMB', 'Glutamine', 
  'Citrulline', 'Pre-Workout', 'Post-Workout',
  
  // Digestive Health
  'Probiotics', 'Digestive Enzymes', 'Fiber Supplement', 'Psyllium Husk', 
  'Apple Cider Vinegar', 'Betaine HCl', 'Pepsin',
  
  // Joint & Bone Health
  'Collagen', 'Glucosamine', 'Chondroitin', 'MSM', 'Hyaluronic Acid', 
  'Calcium with D3', 'Boswellia',
  
  // Brain & Cognitive
  'Alpha-GPC', 'Phosphatidylserine', 'Bacopa Monnieri', 'Nootropic Blends', 
  'Acetyl-L-Carnitine', 'PQQ', 'NAD+',
  
  // Sleep & Relaxation
  'Melatonin', 'Magnesium Glycinate', 'Valerian Root', 'Passionflower', 
  'Chamomile', 'GABA', '5-HTP',
  
  // Antioxidants
  'CoQ10', 'Resveratrol', 'Quercetin', 'Green Tea Extract', 'Grape Seed Extract', 
  'Alpha Lipoic Acid', 'Astaxanthin', 'Lutein', 'Zeaxanthin',
  
  // Specialized
  'Multivitamin', 'Prenatal Vitamins', 'Hair, Skin & Nails', 'Eye Health Formula', 
  'Heart Health Formula', 'Immune Support', 'Energy Formula', 'Stress Formula'
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customSupplement, setCustomSupplement] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('daily');

  const filteredSupplements = comprehensiveSupplements.filter(supplement =>
    supplement.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addSelectedSupplement = () => {
    const supplementToAdd = showCustomInput ? customSupplement : selectedSupplement;
    if (supplementToAdd && dosage && frequency) {
      const newSupplements = {
        ...formData.currentSupplements,
        [supplementToAdd]: { dosage, frequency }
      };
      updateFormData({ currentSupplements: newSupplements });
      
      // Reset form
      setSelectedSupplement('');
      setCustomSupplement('');
      setDosage('');
      setFrequency('daily');
      setShowCustomInput(false);
      setIsModalOpen(false);
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
          
          {/* Large Select Supplements Button */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gradient-primary min-h-[48px] text-lg font-medium mb-4">
                <Plus className="w-5 h-5 mr-2" />
                Select Supplements
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-lg max-h-[80vh] bg-background border border-border">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Choose Supplements</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search supplements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Supplement Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select a supplement:</Label>
                  
                  <ScrollArea className="h-48 border rounded-lg p-2">
                    <div className="space-y-2">
                      {filteredSupplements.map((supplement) => (
                         <div
                          key={supplement}
                          className={`p-2 rounded cursor-pointer transition-colors ${
                            selectedSupplement === supplement && !showCustomInput
                              ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-800 font-medium'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            setSelectedSupplement(supplement);
                            setShowCustomInput(false);
                          }}
                        >
                          {supplement}
                        </div>
                      ))}
                      
                      {/* Add Custom Supplement Option */}
                      <div
                        className={`p-2 rounded cursor-pointer border-2 border-dashed transition-colors ${
                          showCustomInput
                            ? 'bg-blue-50 border-blue-500'
                            : 'border-muted-foreground/30 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}
                        onClick={() => {
                          setShowCustomInput(true);
                          setSelectedSupplement('');
                        }}
                      >
                        <div className="flex items-center text-blue-600 font-medium">
                          <Plus className="w-4 h-4 mr-2" />
                          Add a custom supplement
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  {/* Custom Supplement Input */}
                  {showCustomInput && (
                    <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Label className="text-sm font-medium text-blue-800">Custom supplement name:</Label>
                      <Input
                        placeholder="Enter supplement name..."
                        value={customSupplement}
                        onChange={(e) => setCustomSupplement(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  )}

                  {/* Dosage and Frequency */}
                  {(selectedSupplement || customSupplement) && (
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-medium">Dosage:</Label>
                          <Input
                            placeholder="e.g., 1000mg"
                            value={dosage}
                            onChange={(e) => setDosage(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Frequency:</Label>
                          <Select value={frequency} onValueChange={setFrequency}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="every_other_day">Every other day</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="as_needed">As needed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={addSelectedSupplement}
                        disabled={!dosage || (!selectedSupplement && !customSupplement)}
                        className="w-full gradient-primary"
                      >
                        Add Supplement
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Current supplements list */}
          {Object.keys(formData.currentSupplements).length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Current supplements:</Label>
              {Object.entries(formData.currentSupplements).map(([supplement, details]) => (
                <div key={supplement} className="flex items-center justify-between p-3 rounded-lg glass-button border-0">
                  <div>
                    <span className="font-medium">{supplement}</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">
                      {details.dosage} • {details.frequency}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSupplement(supplement)}
                    className="p-1 h-auto text-red-500 hover:text-red-700"
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