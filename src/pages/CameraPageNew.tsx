// DO NOT MODIFY: Restored UI — changes must be reviewed
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Sparkles } from 'lucide-react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { CameraActions } from '@/components/camera/CameraActions';
import { BarcodeLogModal } from '@/components/scan/BarcodeLogModal';
import { SavedFoodsTab } from '@/components/camera/SavedFoodsTab';
import { RecentFoodsTab } from '@/components/camera/RecentFoodsTab';
import { toast } from 'sonner';
import { AddWorkoutModal } from '@/components/AddWorkoutModal';
import { SessionPickerModal } from '@/components/meditation/SessionPickerModal';
import { HabitAddModal, HabitConfig } from '@/components/habit-central/HabitAddModal';
import { HabitTemplate } from '@/components/habit-central/CarouselHabitCard';
import { useNavigate } from 'react-router-dom';
import { BARCODE_V2 } from '@/lib/featureFlags';
import { logEvent } from '@/lib/telemetry';

const CameraPageNew = () => {
  useScrollToTop();
  const navigate = useNavigate();
  
  // Modal states
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<HabitTemplate | null>(null);
  
  // Original simple states for nutrition logging
  const [activeTab, setActiveTab] = useState<'main' | 'saved' | 'recent'>('main');
  const [showBarcodeLogModal, setShowBarcodeLogModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualText, setManualText] = useState('');

  // Original simple handlers - open modals instead of complex flows

  // Simple photo handler - opens modal for original photo flow
  const handlePhotoCapture = () => {
    logEvent('nutrition.photo.open');
    setShowPhotoModal(true);
  };

  // Simple voice handler - opens modal for original voice flow
  const handleVoiceToggle = () => {
    logEvent('nutrition.voice.open');
    setShowVoiceModal(true);
  };

  // Barcode handler - uses BARCODE_V2 scanner when enabled
  const handleBarcodeCapture = () => {
    if (!BARCODE_V2) {
      toast.info('Barcode scanning coming soon');
      return;
    }
    logEvent('nutrition.barcode.open');
    setShowBarcodeLogModal(true);
  };

  // Simple manual entry handler - opens modal for original manual flow
  const handleManualEntry = () => {
    logEvent('nutrition.manual.open');
    setShowManualModal(true);
  };

  // Exercise log handler
  const handleExerciseLog = () => {
    setShowExerciseModal(true);
    console.log('[telemetry] log.exercise.open');
  };

  // Recovery log handler  
  const handleRecoveryLog = () => {
    setShowRecoveryModal(true);
    console.log('[telemetry] log.recovery.open');
  };

  // Habit log handler
  const handleHabitLog = () => {
    // For now, create a mock habit template
    const mockHabit: HabitTemplate = {
      id: 'quick-habit',
      slug: 'quick-habit',
      title: 'Quick Habit',
      domain: 'nutrition',
      description: 'Track a quick habit',
      difficulty: 'easy',
      category: 'nutrition'
    };
    setSelectedHabit(mockHabit);
    setShowHabitModal(true);
    console.log('[telemetry] log.habit.open');
  };

  // Tab food selection handler
  const handleTabFoodSelect = (food: any) => {
    toast.success(`Selected ${food.name} - confirmation flow coming soon`);
    setActiveTab('main');
  };

  // Manual entry submit handler
  const handleManualSubmit = () => {
    if (!manualText.trim()) {
      toast.error('Please enter food name or barcode');
      return;
    }
    
    // For now, just show success message - original flow would process this
    toast.success(`Manual entry "${manualText}" - processing coming soon`);
    setManualText('');
    setShowManualModal(false);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <Card className="w-full shadow-2xl border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Nutrition Logger
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Track your meals with AI-powered food recognition
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Actions */}
          {activeTab === 'main' && (
            <div className="space-y-6">
              <CameraActions
                onPhotoCapture={handlePhotoCapture}
                isAnalyzing={false}
                processingStep=""
                onVoiceToggle={handleVoiceToggle}
                isRecording={false}
                isVoiceProcessing={false}
                disabled={false}
                onBarcodeCapture={handleBarcodeCapture}
                onManualEntry={handleManualEntry}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
          )}

          {/* Saved Foods Tab */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              <Button
                onClick={() => setActiveTab('main')}
                variant="outline"
                className="w-full"
              >
                ← Back to Main
              </Button>
              <SavedFoodsTab
                onFoodSelect={handleTabFoodSelect}
              />
            </div>
          )}

          {/* Recent Foods Tab */}
          {activeTab === 'recent' && (
            <div className="space-y-4">
              <Button
                onClick={() => setActiveTab('main')}
                variant="outline"
                className="w-full"
              >
                ← Back to Main
              </Button>
              <RecentFoodsTab
                onFoodSelect={handleTabFoodSelect}
                onBarcodeSelect={(barcode) => {
                  console.log('Barcode selected:', barcode);
                  toast.info('Barcode selection - to be implemented');
                }}
              />
            </div>
          )}

          {/* Original confirmation flows will be restored here when needed */}
        </CardContent>
      </Card>

      {/* Exercise, Recovery & Habits Card */}
      <Card className="w-full shadow-2xl border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 mt-6">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Exercise, Recovery & Habits
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Track your fitness, wellness, and daily habits
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Exercise Log */}
          <Button
            onClick={handleExerciseLog}
            className="h-14 w-full gradient-primary flex items-center justify-between px-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/50"
            size="lg"
          >
            <div className="flex items-center space-x-3">
              <Sparkles className="h-5 w-5" />
              <span className="text-base font-medium">Exercise Log</span>
            </div>
            <div className="h-4 w-4 opacity-60">→</div>
          </Button>

          {/* Recovery Log */}
          <Button
            onClick={handleRecoveryLog}
            className="h-14 w-full gradient-primary flex items-center justify-between px-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/50"
            size="lg"
          >
            <div className="flex items-center space-x-3">
              <Sparkles className="h-5 w-5" />
              <span className="text-base font-medium">Recovery Log</span>
            </div>
            <div className="h-4 w-4 opacity-60">→</div>
          </Button>

          {/* Habit Log */}
          <Button
            onClick={handleHabitLog}
            className="h-14 w-full gradient-primary flex items-center justify-between px-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/50"
            size="lg"
          >
            <div className="flex items-center space-x-3">
              <Sparkles className="h-5 w-5" />
              <span className="text-base font-medium">Habit Log</span>
            </div>
            <div className="h-4 w-4 opacity-60">→</div>
          </Button>
        </CardContent>
      </Card>

      {/* Modals */}
      <BarcodeLogModal
        open={showBarcodeLogModal}
        onOpenChange={setShowBarcodeLogModal}
      />

      {/* Exercise Log Modal */}
      <AddWorkoutModal
        isOpen={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onSave={(workout) => {
          console.log('[telemetry] log.exercise.added:', { workout });
          toast.success('Exercise logged successfully!');
          setShowExerciseModal(false);
        }}
      />

      {/* Recovery Log Modal */}
      <SessionPickerModal
        isOpen={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
        theme={null}
        onStartSession={(session) => {
          console.log('[telemetry] log.recovery.added:', { session });
          toast.success('Recovery session logged!');
          setShowRecoveryModal(false);
        }}
      />

      {/* Habit Log Modal */}
      <HabitAddModal
        habit={selectedHabit}
        open={showHabitModal}
        onClose={() => {
          setShowHabitModal(false);
          setSelectedHabit(null);
        }}
        onConfirm={(config: HabitConfig) => {
          console.log('[telemetry] log.habit.added:', { config });
          toast.success('Habit reminder set up!');
          setShowHabitModal(false);
          setSelectedHabit(null);
        }}
      />

      {/* Original Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Take Photo</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPhotoModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-muted-foreground mb-4">
                Original photo capture modal will be restored here
              </p>
              <Button 
                onClick={() => {
                  toast.info('Photo capture - original flow to be restored');
                  setShowPhotoModal(false);
                }}
                className="w-full"
              >
                Capture Photo
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Original Voice Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Voice Logging</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowVoiceModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-muted-foreground mb-4">
                Listening... Speak now! (Original voice modal to be restored)
              </p>
              <Button 
                onClick={() => {
                  toast.info('Voice recording - original flow to be restored');
                  setShowVoiceModal(false);
                }}
                className="w-full"
              >
                Stop Recording
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Original Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Manual Food Entry</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <Input
                  placeholder="Enter food name or barcode..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualSubmit();
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button onClick={handleManualSubmit} className="flex-1">
                    Search
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowManualModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CameraPageNew;