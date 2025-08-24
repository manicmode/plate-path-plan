
import { useState, useRef, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, Plus, Pill, Zap, Heart, Brain, Shield, Sun, Bone } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { toast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/useSound';
import { SoundGate } from '@/lib/soundGate';
import { SupplementEducationCard } from '@/components/supplements/SupplementEducationCard';

const Supplements = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [supplementName, setSupplementName] = useState('');
  const [dosage, setDosage] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addSupplement } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { playFoodLogConfirm } = useSound();
  
  // Use the scroll-to-top hook
  useScrollToTop();

  const quickSupplements = [
    { name: 'Vitamin D', dosage: 1000, unit: 'IU', icon: Sun },
    { name: 'Vitamin C', dosage: 500, unit: 'mg', icon: Shield },
    { name: 'Omega-3', dosage: 1000, unit: 'mg', icon: Heart },
    { name: 'Multivitamin', dosage: 1, unit: 'tablet', icon: Pill },
    { name: 'Calcium', dosage: 600, unit: 'mg', icon: Bone },
    { name: 'B-Complex', dosage: 1, unit: 'tablet', icon: Brain },
  ];

  const handleImageCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setIsAnalyzing(true);

    // Simulate AI analysis
    setTimeout(() => {
      setSupplementName('Vitamin D');
      setDosage('1000');
      setIsAnalyzing(false);
      toast({
        title: "Supplement Analyzed!",
        description: "We detected Vitamin D. Please confirm the details.",
      });
    }, 2000);
  };

  const handleQuickAdd = (supplement: typeof quickSupplements[0]) => {
    addSupplement({
      name: supplement.name,
      dosage: supplement.dosage,
      unit: supplement.unit,
      notifications: [],
    });
    
    // Play success sound
    SoundGate.markConfirm();
    playFoodLogConfirm();
    
    toast({
      title: "Supplement Added!",
      description: `${supplement.name} (${supplement.dosage}${supplement.unit}) logged successfully.`,
    });
    
    navigate('/');
  };

  const handleManualSubmit = () => {
    if (!supplementName || !dosage) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    // Parse dosage to extract number and unit
    const dosageMatch = dosage.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]*)/);
    const dosageNumber = dosageMatch ? parseFloat(dosageMatch[1]) : parseFloat(dosage);
    const dosageUnit = dosageMatch?.[2] || 'unit';

    addSupplement({
      name: supplementName,
      dosage: dosageNumber,
      unit: dosageUnit,
      notifications: [],
      image: selectedImage || undefined,
    });

    // Play success sound
    SoundGate.markConfirm();
    playFoodLogConfirm();

    toast({
      title: "Supplement Added!",
      description: `${supplementName} (${dosageNumber}${dosageUnit}) logged successfully.`,
    });

    navigate('/');
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="text-center space-y-2 sm:space-y-4">
        <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} gradient-primary rounded-3xl flex items-center justify-center mx-auto neon-glow`}>
          <Pill className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
        </div>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold neon-text`}>Supplement Tracker</h1>
          <p className={`text-gray-600 dark:text-gray-300 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>Track your vitamins and minerals</p>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
          <CardTitle className={`text-center text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>Quick Add</CardTitle>
        </CardHeader>
        <CardContent className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 gap-4'} ${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          {quickSupplements.map((supplement) => {
            const Icon = supplement.icon;
            return (
              <Button
                key={supplement.name}
                onClick={() => handleQuickAdd(supplement)}
                className={`glass-button ${isMobile ? 'h-20' : 'h-24'} flex flex-col items-center justify-center space-y-2 micro-bounce rounded-2xl`}
              >
                <Icon className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} text-purple-500 dark:text-purple-400`} />
                <div className="text-center">
                  <p className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800 dark:text-gray-100 leading-tight`}>{supplement.name}</p>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-300 leading-tight`}>{supplement.dosage} {supplement.unit}</p>
                </div>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Supplement Education */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white mb-2`}>
            General recommendations just for you
          </h2>
          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-300`}>
            Evidence-based supplement insights tailored to your health goals
          </p>
        </div>
        
        <div className="mt-6 sm:mt-8">
          <SupplementEducationCard />
        </div>

        <div className="text-center pt-4">
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white mb-2`}>
            My supplements
          </h2>
          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-300`}>
            Track your daily supplement intake
          </p>
        </div>
      </div>

      {/* Camera & Upload Options */}
      <div className={`grid grid-cols-2 ${isMobile ? 'gap-3' : 'gap-4'}`}>
        <Button
          onClick={() => fileInputRef.current?.click()}
          className={`glass-button ${isMobile ? 'h-20' : 'h-24'} flex flex-col items-center justify-center space-y-2 rounded-2xl`}
        >
          <Camera className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} text-purple-500 dark:text-purple-400`} />
          <span className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800 dark:text-gray-100`}>Capture Supplement</span>
        </Button>
        
        <Button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className={`glass-button ${isMobile ? 'h-20' : 'h-24'} flex flex-col items-center justify-center space-y-2 rounded-2xl`}
        >
          <Plus className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} text-purple-500 dark:text-purple-400`} />
          <span className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800 dark:text-gray-100`}>Manual Entry</span>
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageCapture}
        className="hidden"
      />

      {/* Image Preview */}
      {selectedImage && (
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <img
              src={selectedImage}
              alt="Captured supplement"
              className={`w-full ${isMobile ? 'h-48' : 'h-64'} object-cover rounded-2xl mb-4`}
            />
            {isAnalyzing && (
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}>Analyzing your supplement...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Entry Form */}
      {(showManualEntry || selectedImage) && !isAnalyzing && (
        <Card className="glass-card border-0 rounded-3xl">
          <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
            <CardTitle className={`text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>Supplement Details</CardTitle>
          </CardHeader>
          <CardContent className={`space-y-3 sm:space-y-4 ${isMobile ? 'p-4' : 'p-6'} pt-0`}>
            <div>
              <Label htmlFor="supplementName" className={`text-gray-700 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}>Supplement Name</Label>
              <Input
                id="supplementName"
                value={supplementName}
                onChange={(e) => setSupplementName(e.target.value)}
                placeholder="e.g., Vitamin D, Omega-3, Calcium"
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
              />
            </div>
            <div>
              <Label htmlFor="dosage" className={`text-gray-700 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}>Dosage</Label>
              <Input
                id="dosage"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g., 1000mg, 2 tablets, 500 IU"
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
              />
            </div>
            <Button
              onClick={handleManualSubmit}
              className={`gradient-primary w-full rounded-2xl ${isMobile ? 'h-10' : 'h-12'} neon-glow`}
            >
              Log Supplement
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Supplements;
