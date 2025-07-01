
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Camera, Plus, Pill, Clock, Bell } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const Supplements = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [supplementName, setSupplementName] = useState('');
  const [dosage, setDosage] = useState('');
  const [unit, setUnit] = useState('mg');
  const [frequency, setFrequency] = useState('');
  const [enableNotifications, setEnableNotifications] = useState(false);
  const [notificationTimes, setNotificationTimes] = useState(['']);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addSupplement } = useNutrition();
  const navigate = useNavigate();

  const quickSupplements = [
    { name: 'Protein Shake', dosage: '30', unit: 'g' },
    { name: 'Multivitamin', dosage: '1', unit: 'tablet' },
    { name: 'Omega-3', dosage: '1000', unit: 'mg' },
    { name: 'Vitamin D', dosage: '2000', unit: 'IU' },
    { name: 'Creatine', dosage: '5', unit: 'g' },
    { name: 'BCAA', dosage: '10', unit: 'g' },
  ];

  const handleImageCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setIsAnalyzing(true);

    // Simulate AI analysis
    setTimeout(() => {
      setSupplementName('Protein Powder');
      setDosage('30');
      setUnit('g');
      setIsAnalyzing(false);
      toast({
        title: "Supplement Analyzed!",
        description: "We detected protein powder. Please confirm the details.",
      });
    }, 2000);
  };

  const handleQuickAdd = (supplement: typeof quickSupplements[0]) => {
    addSupplement({
      name: supplement.name,
      dosage: parseFloat(supplement.dosage),
      unit: supplement.unit,
      notifications: [],
    });
    
    toast({
      title: "Supplement Added!",
      description: `${supplement.name} logged successfully.`,
    });
    
    navigate('/');
  };

  const addNotificationTime = () => {
    setNotificationTimes([...notificationTimes, '']);
  };

  const updateNotificationTime = (index: number, time: string) => {
    const updated = [...notificationTimes];
    updated[index] = time;
    setNotificationTimes(updated);
  };

  const removeNotificationTime = (index: number) => {
    setNotificationTimes(notificationTimes.filter((_, i) => i !== index));
  };

  const handleManualSubmit = () => {
    if (!supplementName || !dosage) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const notifications = enableNotifications 
      ? notificationTimes.filter(time => time).map(time => ({ time, frequency: frequency || 'daily' }))
      : [];

    addSupplement({
      name: supplementName,
      dosage: parseFloat(dosage),
      unit,
      frequency,
      notifications,
      image: selectedImage || undefined,
    });

    toast({
      title: "Supplement Added!",
      description: `${supplementName} logged with ${notifications.length} reminder${notifications.length !== 1 ? 's' : ''}.`,
    });

    navigate('/');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 gradient-primary rounded-3xl flex items-center justify-center mx-auto neon-glow">
          <Pill className="h-10 w-10 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold neon-text">Supplements</h1>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Track your vitamins & supplements</p>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-center text-gray-900 dark:text-white">Quick Add</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {quickSupplements.map((supplement) => (
            <Button
              key={supplement.name}
              onClick={() => handleQuickAdd(supplement)}
              className="glass-button h-16 flex flex-col items-center space-y-1 micro-bounce"
            >
              <Pill className="h-4 w-4 text-purple-600" />
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{supplement.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{supplement.dosage}{supplement.unit}</p>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Camera & Upload Options */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="glass-button h-20 flex flex-col items-center space-y-2 rounded-2xl"
        >
          <Camera className="h-6 w-6 text-purple-600" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Capture Supplement</span>
        </Button>
        
        <Button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="glass-button h-20 flex flex-col items-center space-y-2 rounded-2xl"
        >
          <Plus className="h-6 w-6 text-purple-600" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Manual Entry</span>
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
          <CardContent className="p-6">
            <img
              src={selectedImage}
              alt="Captured supplement"
              className="w-full h-64 object-cover rounded-2xl mb-4"
            />
            {isAnalyzing && (
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-gray-600 dark:text-gray-300">Analyzing your supplement...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Entry Form */}
      {(showManualEntry || selectedImage) && !isAnalyzing && (
        <Card className="glass-card border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Supplement Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="supplementName" className="text-gray-700 dark:text-gray-300">Supplement Name</Label>
              <Input
                id="supplementName"
                value={supplementName}
                onChange={(e) => setSupplementName(e.target.value)}
                placeholder="e.g., Protein Powder, Multivitamin"
                className="glass-button border-0"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dosage" className="text-gray-700 dark:text-gray-300">Dosage</Label>
                <Input
                  id="dosage"
                  type="number"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g., 30, 1"
                  className="glass-button border-0"
                />
              </div>
              <div>
                <Label htmlFor="unit" className="text-gray-700 dark:text-gray-300">Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="glass-button border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mg">mg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="IU">IU</SelectItem>
                    <SelectItem value="tablet">tablet</SelectItem>
                    <SelectItem value="capsule">capsule</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="frequency" className="text-gray-700 dark:text-gray-300">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="glass-button border-0">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="twice-daily">Twice Daily</SelectItem>
                  <SelectItem value="three-times-daily">Three Times Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="as-needed">As Needed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notifications */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-gray-700 dark:text-gray-300">Enable Reminders</Label>
                <Switch
                  checked={enableNotifications}
                  onCheckedChange={setEnableNotifications}
                />
              </div>

              {enableNotifications && (
                <div className="space-y-3">
                  <Label className="text-gray-700 dark:text-gray-300">Reminder Times</Label>
                  {notificationTimes.map((time, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => updateNotificationTime(index, e.target.value)}
                        className="glass-button border-0 flex-1"
                      />
                      {notificationTimes.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeNotificationTime(index)}
                          className="glass-button border-0"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addNotificationTime}
                    className="glass-button border-0 w-full"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Add Reminder Time
                  </Button>
                </div>
              )}
            </div>

            <Button
              onClick={handleManualSubmit}
              className="gradient-primary w-full rounded-2xl h-12 neon-glow"
            >
              <Bell className="h-4 w-4 mr-2" />
              Log Supplement
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Supplements;
