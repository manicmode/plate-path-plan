import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ScanBarcode, 
  Camera, 
  Keyboard, 
  Mic, 
  Bookmark, 
  History,
  ArrowLeft
} from 'lucide-react';
import { ScanTile } from '@/components/scan/ScanTile';
import { Button } from '@/components/ui/button';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { toast } from 'sonner';
import { useScanRecents } from '@/hooks/useScanRecents';
import { HealthCheckModal } from '@/components/health-check/HealthCheckModal';
import { PhotoCaptureModal } from '@/components/scan/PhotoCaptureModal';
import { ImprovedManualEntry } from '@/components/health-check/ImprovedManualEntry';
import { VoiceSearchModal } from '@/components/scan/VoiceSearchModal';

export default function ScanHub() {
  const navigate = useNavigate();
  const { addRecent } = useScanRecents();
  
  const [healthCheckModalOpen, setHealthCheckModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);  
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  // Feature flag checks
  const imageAnalyzerEnabled = isFeatureEnabled('image_analyzer_v1');
  const voiceEnabled = isFeatureEnabled('fallback_voice_enabled');
  const textEnabled = isFeatureEnabled('fallback_text_enabled');

  const logTileClick = (tile: string) => {
    console.log('scan_tile_click', { 
      tile, 
      timestamp: Date.now() 
    });
  };

  const handleScanBarcode = () => {
    logTileClick('barcode');
    setHealthCheckModalOpen(true);
  };

  const handleTakePhoto = () => {
    logTileClick('photo');
    if (!imageAnalyzerEnabled) {
      toast('Photo analysis is in beta; try manual or voice for now.');
      setManualEntryOpen(true);
    } else {
      setPhotoModalOpen(true);
    }
  };

  const handleEnterManually = () => {
    logTileClick('manual');
    if (!textEnabled) {
      toast('Manual entry is currently disabled');
      return;
    }
    setManualEntryOpen(true);
  };

  const handleSpeakToAnalyze = () => {
    logTileClick('voice');
    if (!voiceEnabled) {
      toast('Voice analysis is currently disabled');
      return;
    }
    setVoiceModalOpen(true);
  };

  const handleSaves = () => {
    logTileClick('saves');
    // Navigate to existing saved reports
    navigate('/saved-reports'); // Adjust route to actual saved reports page
  };

  const handleRecents = () => {
    logTileClick('recents');
    navigate('/scan/recents');
  };

  // Handle barcode detection from scanner - this will be handled by HealthCheckModal
  // Just track in recents when modal closes successfully

  // Handle photo capture
  const handlePhotoCapture = (imageData: string) => {
    console.log('Photo captured, processing...');
    addRecent({ mode: 'photo', label: 'Photo scan' });
    
    // Use the modal system instead of broken /health-report route
    setPhotoModalOpen(false); // Close photo modal
    setHealthCheckModalOpen(true); // Open health check with image data
  };

  // Handle photo fallback to manual
  const handlePhotoManualFallback = () => {
    setPhotoModalOpen(false);
    setManualEntryOpen(true);
  };

  // Handle manual entry product selection
  const handleManualProductSelected = (product: any) => {
    console.log('Manual product selected:', product);
    addRecent({ mode: 'manual', label: product.productName || 'Manual entry' });
    
    // Use the modal system instead of broken /health-report route
    setHealthCheckModalOpen(false); // Close manual entry modal
    setHealthCheckModalOpen(true); // Reopen with product data
  };

  // Handle voice product selection
  const handleVoiceProductSelected = (product: any) => {
    console.log('Voice product selected:', product);
    addRecent({ mode: 'voice', label: product.productName || 'Voice entry' });
    
    // Use the modal system instead of broken /health-report route  
    setHealthCheckModalOpen(true); // Open health check with product data
  };

  // Log page open
  console.log('scan_hub_open', { timestamp: Date.now() });

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-600 via-rose-700 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="relative text-center mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="absolute left-0 top-0 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-4xl font-bold text-white mb-3">
            Health Scan
          </h1>
          <p className="text-rose-100/80 text-lg">
            Choose how you want to analyze food
          </p>
        </div>

        {/* Grid of tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <ScanTile
            icon={ScanBarcode}
            title="Scan Barcode"
            subtitle="Quick scan for packaged foods"
            onClick={handleScanBarcode}
          />

          <ScanTile
            icon={Camera}
            title="Take a Photo"
            subtitle="AI-powered ingredient analysis"
            onClick={handleTakePhoto}
            disabled={!imageAnalyzerEnabled}
          />

          <ScanTile
            icon={Keyboard}
            title="Enter Manually"
            subtitle="Type the food name or brand"
            onClick={handleEnterManually}
            disabled={!textEnabled}
          />

          <ScanTile
            icon={Mic}
            title="Speak to Analyze"
            subtitle="Voice-powered food search"
            onClick={handleSpeakToAnalyze}
            disabled={!voiceEnabled}
          />

          <ScanTile
            icon={Bookmark}
            title="Saved Reports"
            subtitle="View your saved health reports"
            onClick={handleSaves}
          />

          <ScanTile
            icon={History}
            title="Recent Scans"
            subtitle="Quick access to recent lookups"
            onClick={handleRecents}
          />
        </div>

        {/* Voice Note */}
        {!voiceEnabled && (
          <p className="text-center text-white/60 text-sm mt-4">
            Voice feature is coming soon
          </p>
        )}
      </div>

      {/* Modals */}
      <HealthCheckModal
        isOpen={healthCheckModalOpen}
        onClose={() => setHealthCheckModalOpen(false)}
      />

      <PhotoCaptureModal
        open={photoModalOpen}
        onOpenChange={setPhotoModalOpen}
        onCapture={handlePhotoCapture}
        onManualFallback={handlePhotoManualFallback}
      />

      {manualEntryOpen && (
        <ImprovedManualEntry
          onProductSelected={handleManualProductSelected}
          onBack={() => setManualEntryOpen(false)}
        />
      )}

      <VoiceSearchModal
        open={voiceModalOpen}
        onOpenChange={setVoiceModalOpen}
        onProductSelected={handleVoiceProductSelected}
      />
    </div>
  );
}