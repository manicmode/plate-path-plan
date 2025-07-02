
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, Plus, Droplets, Coffee, Wine, Milk } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';

const Hydration = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [drinkName, setDrinkName] = useState('');
  const [volume, setVolume] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addHydration } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const quickDrinks = [
    { name: 'Water Glass', volume: 250, icon: Droplets },
    { name: 'Water Bottle', volume: 500, icon: Droplets },
    { name: 'Coffee', volume: 200, icon: Coffee },
    { name: 'Tea', volume: 200, icon: Coffee },
    { name: 'Juice', volume: 300, icon: Wine },
    { name: 'Milk', volume: 250, icon: Milk },
  ];

  const handleImageCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setIsAnalyzing(true);

    // Simulate AI analysis
    setTimeout(() => {
      setDrinkName('Water');
      setVolume('300');
      setIsAnalyzing(false);
      toast({
        title: "Drink Analyzed!",
        description: "We detected water. Please confirm the details.",
      });
    }, 2000);
  };

  const handleQuickAdd = (drink: typeof quickDrinks[0]) => {
    addHydration({
      name: drink.name,
      volume: drink.volume,
      type: drink.name.toLowerCase().includes('water') ? 'water' : 'other',
    });
    
    toast({
      title: "Drink Added!",
      description: `${drink.name} (${drink.volume}ml) logged successfully.`,
    });
    
    navigate('/');
  };

  const handleManualSubmit = () => {
    if (!drinkName || !volume) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    addHydration({
      name: drinkName,
      volume: parseInt(volume),
      type: drinkName.toLowerCase().includes('water') ? 'water' : 'other',
      image: selectedImage || undefined,
    });

    toast({
      title: "Drink Added!",
      description: `${drinkName} (${volume}ml) logged successfully.`,
    });

    navigate('/');
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="text-center space-y-2 sm:space-y-4">
        <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} gradient-primary rounded-3xl flex items-center justify-center mx-auto neon-glow`}>
          <Droplets className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
        </div>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold neon-text`}>Hydration Tracker</h1>
          <p className={`text-gray-600 dark:text-gray-300 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>Stay hydrated, stay healthy</p>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
          <CardTitle className={`text-center text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>Quick Add</CardTitle>
        </CardHeader>
        <CardContent className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-3'} ${isMobile ? 'p-3' : 'p-6'} pt-0`}>
          {quickDrinks.map((drink) => {
            const Icon = drink.icon;
            return (
              <Button
                key={drink.name}
                onClick={() => handleQuickAdd(drink)}
                className={`glass-button ${isMobile ? 'h-14' : 'h-16'} flex flex-col items-center ${isMobile ? 'space-y-1' : 'space-y-2'} micro-bounce rounded-2xl`}
              >
                <Icon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-emerald-600`} />
                <div className="text-center">
                  <p className={`${isMobile ? 'text-xs' : 'text-xs'} font-semibold text-gray-700 dark:text-gray-200`}>{drink.name}</p>
                  <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 dark:text-gray-400`}>{drink.volume}ml</p>
                </div>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Camera & Upload Options */}
      <div className={`grid grid-cols-2 ${isMobile ? 'gap-3' : 'gap-4'}`}>
        <Button
          onClick={() => fileInputRef.current?.click()}
          className={`glass-button ${isMobile ? 'h-16' : 'h-20'} flex flex-col items-center space-y-2 rounded-2xl`}
        >
          <Camera className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-emerald-600`} />
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-700 dark:text-gray-200`}>Capture Drink</span>
        </Button>
        
        <Button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className={`glass-button ${isMobile ? 'h-16' : 'h-20'} flex flex-col items-center space-y-2 rounded-2xl`}
        >
          <Plus className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-emerald-600`} />
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-700 dark:text-gray-200`}>Manual Entry</span>
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
              alt="Captured drink"
              className={`w-full ${isMobile ? 'h-48' : 'h-64'} object-cover rounded-2xl mb-4`}
            />
            {isAnalyzing && (
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}>Analyzing your drink...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Entry Form */}
      {(showManualEntry || selectedImage) && !isAnalyzing && (
        <Card className="glass-card border-0 rounded-3xl">
          <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
            <CardTitle className={`text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>Drink Details</CardTitle>
          </CardHeader>
          <CardContent className={`space-y-3 sm:space-y-4 ${isMobile ? 'p-4' : 'p-6'} pt-0`}>
            <div>
              <Label htmlFor="drinkName" className={`text-gray-700 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}>Drink Name</Label>
              <Input
                id="drinkName"
                value={drinkName}
                onChange={(e) => setDrinkName(e.target.value)}
                placeholder="e.g., Water, Coffee, Juice"
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
              />
            </div>
            <div>
              <Label htmlFor="volume" className={`text-gray-700 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}>Volume (ml)</Label>
              <Input
                id="volume"
                type="number"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="e.g., 250, 500"
                className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
              />
            </div>
            <Button
              onClick={handleManualSubmit}
              className={`gradient-primary w-full rounded-2xl ${isMobile ? 'h-10' : 'h-12'} neon-glow`}
            >
              Log Drink
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Hydration;
