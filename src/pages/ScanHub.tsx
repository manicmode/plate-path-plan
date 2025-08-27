import { useNavigate } from 'react-router-dom';
import { ScanBarcode, Camera, Keyboard, Mic, Bookmark, History } from 'lucide-react';
import { ScanTile } from '@/components/scan/ScanTile';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { useToast } from '@/hooks/use-toast';

export default function ScanHub() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Feature flag checks
  const analyzerEnabled = isFeatureEnabled('image_analyzer_v1');
  const voiceEnabled = isFeatureEnabled('fallback_voice_enabled');
  const textEnabled = isFeatureEnabled('fallback_text_enabled');

  // Telemetry
  const logTileClick = (tile: string, dest: string) => {
    console.log('scan_hub_tile_click', { tile, dest, timestamp: Date.now() });
  };

  const handleScanBarcode = () => {
    logTileClick('barcode', '/health-check');
    navigate('/health-check');
  };

  const handleTakePhoto = () => {
    if (!analyzerEnabled) {
      toast({
        title: "Photo analysis is in beta",
        description: "Try manual entry or voice instead.",
        variant: "default"
      });
      logTileClick('photo', '/health-check?fallback=manual');
      navigate('/health-check');
      return;
    }
    logTileClick('photo', '/health-check');
    navigate('/health-check');
  };

  const handleEnterManually = () => {
    logTileClick('manual', '/health-check?fallback=manual');
    navigate('/health-check');
  };

  const handleSpeakToAnalyze = () => {
    if (!voiceEnabled) {
      toast({
        title: "Voice analysis not available",
        description: "Voice features are disabled.",
        variant: "destructive"
      });
      return;
    }
    logTileClick('voice', '/health-check?fallback=voice');
    navigate('/health-check');
  };

  const handleSaves = () => {
    logTileClick('saves', '/saved-reports');
    // Navigate to existing saved reports (placeholder)
    toast({
      title: "Saved Reports",
      description: "This will navigate to your saved reports.",
    });
  };

  const handleRecents = () => {
    logTileClick('recents', '/scan/recents');
    navigate('/scan/recents');
  };

  // Log page open
  console.log('scan_hub_open', { timestamp: Date.now() });

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-600 via-rose-700 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
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
            disabled={!analyzerEnabled}
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

        {/* Voice availability note */}
        {voiceEnabled && (
          <div className="text-center mt-8">
            <p className="text-rose-200/60 text-sm">
              Voice features depend on browser support
            </p>
          </div>
        )}
      </div>
    </div>
  );
}