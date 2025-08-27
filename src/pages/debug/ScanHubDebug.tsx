import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ScanBarcode, Camera, Keyboard, Mic, Bookmark, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { HealthCheckModal } from '@/components/health-check/HealthCheckModal';
import { PhotoCaptureModal } from '@/components/scan/PhotoCaptureModal';
import { ImprovedManualEntry } from '@/components/health-check/ImprovedManualEntry';
import { VoiceSearchModal } from '@/components/scan/VoiceSearchModal';
import { toast } from 'sonner';

export function ScanHubDebug() {
  const navigate = useNavigate();
  
  const [healthCheckModalOpen, setHealthCheckModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  // Feature flags
  const flags = {
    scan_hub_enabled: isFeatureEnabled('scan_hub_enabled'),
    analyzer_enabled: isFeatureEnabled('image_analyzer_v1'),
    fallback_text_enabled: isFeatureEnabled('fallback_text_enabled'),
    fallback_voice_enabled: isFeatureEnabled('fallback_voice_enabled'),
    voice_stt_server_enabled: isFeatureEnabled('voice_stt_server_enabled')
  };

  const tiles = [
    {
      id: 'barcode',
      title: 'Scan Barcode',
      icon: ScanBarcode,
      action: () => setHealthCheckModalOpen(true),
      enabled: true
    },
    {
      id: 'photo',
      title: 'Take Photo',
      icon: Camera,
      action: () => {
        if (!flags.analyzer_enabled) {
          toast('Photo analysis is in beta; try manual or voice for now.');
          setManualEntryOpen(true);
        } else {
          setPhotoModalOpen(true);
        }
      },
      enabled: true
    },
    {
      id: 'manual',
      title: 'Enter Manually',
      icon: Keyboard,
      action: () => setManualEntryOpen(true),
      enabled: flags.fallback_text_enabled
    },
    {
      id: 'voice',
      title: 'Speak to Analyze',
      icon: Mic,
      action: () => setVoiceModalOpen(true),
      enabled: flags.fallback_voice_enabled
    },
    {
      id: 'saves',
      title: 'Saves',
      icon: Bookmark,
      action: () => navigate('/saved-reports'),
      enabled: true
    },
    {
      id: 'recents',
      title: 'Recents',
      icon: History,
      action: () => navigate('/scan/recents'),
      enabled: true
    }
  ];

  const handleBarcodeDetected = (barcode: string) => {
    console.log('[DEBUG] Barcode detected:', barcode);
    toast.success(`Barcode detected: ${barcode}`);
    navigate(`/health-report?barcode=${barcode}`);
  };

  const handlePhotoCapture = (imageData: string) => {
    console.log('[DEBUG] Photo captured');
    toast.success('Photo captured successfully');
    navigate('/health-report', { state: { imageData } });
  };

  const handleProductSelected = (product: any) => {
    console.log('[DEBUG] Product selected:', product);
    toast.success(`Product selected: ${product.productName}`);
    navigate('/health-report', { state: { product } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => navigate('/debug')}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Scan Hub Debug</h1>
            <p className="text-gray-300">Test and debug scan hub functionality</p>
          </div>
        </div>

        {/* Feature Flags */}
        <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Feature Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(flags).map(([flag, enabled]) => (
                <div key={flag} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{flag}</span>
                  <Badge variant={enabled ? "default" : "secondary"}>
                    {enabled ? 'ON' : 'OFF'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tile Actions */}
        <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Quick Tile Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {tiles.map((tile) => {
                const Icon = tile.icon;
                return (
                  <Button
                    key={tile.id}
                    onClick={tile.action}
                    disabled={!tile.enabled}
                    variant="outline"
                    className={`h-20 flex flex-col space-y-2 border-white/30 text-white hover:bg-white/20 ${
                      tile.enabled ? '' : 'opacity-50'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm">{tile.title}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* QA Checklist */}
        <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">QA Checklist</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300 space-y-2">
            <div className="text-sm space-y-1">
              <p>✓ Barcode tile opens scanner with torch functionality</p>
              <p>✓ Photo tile opens camera or redirects to manual if analyzer disabled</p>
              <p>✓ Manual tile opens improved search interface</p>
              <p>✓ Voice tile records and processes speech</p>
              <p>✓ All flows converge to health report view</p>
              <p>✓ Feature flags allow instant rollback</p>
              <p>✓ Recents track successful scans in localStorage</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Modals */}
      <HealthCheckModal
        isOpen={healthCheckModalOpen}
        onClose={() => setHealthCheckModalOpen(false)}
      />

      <PhotoCaptureModal
        open={photoModalOpen}
        onOpenChange={setPhotoModalOpen}
        onCapture={handlePhotoCapture}
        onManualFallback={() => {
          setPhotoModalOpen(false);
          setManualEntryOpen(true);
        }}
      />

      {manualEntryOpen && (
        <ImprovedManualEntry
          onProductSelected={handleProductSelected}
          onBack={() => setManualEntryOpen(false)}
        />
      )}

      <VoiceSearchModal
        open={voiceModalOpen}
        onOpenChange={setVoiceModalOpen}
        onProductSelected={handleProductSelected}
      />
    </div>
  );
}