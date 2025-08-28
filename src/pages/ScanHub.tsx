import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ScanBarcode, 
  Camera, 
  Keyboard, 
  Mic, 
  Bookmark, 
  History,
  ArrowLeft,
  Activity
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
import { goToHealthAnalysis } from '@/lib/nav';

export default function ScanHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addRecent } = useScanRecents();
  
  // Track original entry point to avoid going back to saved/recent scans
  const originalEntryRef = useRef<string | null>(null);
  
  // Parse URL params for forced health modal
  const qs = new URLSearchParams(location.search);
  const modalParam = qs.get('modal');                // 'health' | 'barcode' | 'voice' | null
  const source = (qs.get('source') ?? '') as 'off'|'manual'|'barcode'|'photo'|'voice'|'';
  const barcode = qs.get('barcode') ?? undefined;
  const name = qs.get('name') ?? undefined;

  const forceHealth = modalParam === 'health';
  const forceVoice = modalParam === 'voice';
  const handledRef = useRef(false);

  // Track original entry point - only set once and persist
  useEffect(() => {
    // Only track the original entry if not already set and not coming from scan-related pages
    if (!originalEntryRef.current) {
      const stateFrom = location.state?.from;
      const currentPath = location.pathname;
      
      // If coming with state.from and it's not a scan page, use it
      if (stateFrom && !stateFrom.includes('/scan')) {
        originalEntryRef.current = stateFrom;
      } 
      // If no state or coming from scan pages, check session storage for persistence
      else {
        const storedEntry = sessionStorage.getItem('scan-original-entry');
        if (storedEntry && !storedEntry.includes('/scan')) {
          originalEntryRef.current = storedEntry;
        } else {
          // Check document referrer to determine if came from explore vs home
          const referrer = document.referrer;
          let defaultEntry = '/';
          
          if (referrer) {
            const referrerUrl = new URL(referrer);
            const referrerPath = referrerUrl.pathname;
            
            // If came from explore page, default back to explore
            if (referrerPath.includes('/explore') || referrerPath === '/explore') {
              defaultEntry = '/explore';
            }
            // If came from home or any specific page, use that path
            else if (referrerPath !== '/scan' && !referrerPath.includes('/scan')) {
              defaultEntry = referrerPath;
            }
          }
          
          originalEntryRef.current = defaultEntry;
          sessionStorage.setItem('scan-original-entry', defaultEntry);
        }
      }
      
      // Store for persistence across navigation
      if (originalEntryRef.current) {
        sessionStorage.setItem('scan-original-entry', originalEntryRef.current);
        console.log('[SCAN] Tracked original entry:', originalEntryRef.current);
      }
    }
  }, [location]);
  
  const [healthCheckModalOpen, setHealthCheckModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);  
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [currentState, setCurrentState] = useState<'hub' | 'search'>('hub');
  const [searchState, setSearchState] = useState({
    source: 'voice' as 'voice' | 'manual',
    initialQuery: '',
    didInitVoice: false
  });

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
    // Guard against auto-opening barcode when we want health modal
    if (forceHealth || handledRef.current) return;
    
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
    // Navigate to saved reports page with current scan hub as referrer
    navigate('/scan/saved-reports', { 
      state: { from: '/scan' } 
    });
  };

  const handleRecents = () => {
    logTileClick('recents');
    // Navigate to recent scans page with current scan hub as referrer  
    navigate('/scan/recent-scans', { 
      state: { from: '/scan' } 
    });
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
    
    // Use the URL-based navigation to health analyzer
    import('@/lib/nav').then(({ goToHealthAnalysis }) => {
      goToHealthAnalysis(navigate, {
        source: 'off',
        barcode: product?.barcode || undefined,
        name: product?.productName || ''
      });
    });
  };

  // Handle voice product selection - navigate directly to health analysis (No scanner for voice!)
  const handleVoiceProductSelected = (product: any) => {
    console.log('Voice product selected:', product);
    addRecent({ mode: 'voice', label: product.productName || 'Voice entry' });
    
    // Never open scanner from voice - go directly to health analysis
    goToHealthAnalysis(navigate, { 
      source: 'voice',
      name: product.productName || product.name || ''
    });
  };

  // Handle URL params to force modals (with guards)
  useEffect(() => {
    if ((!forceHealth && !forceVoice) || handledRef.current) return;
    handledRef.current = true;

    if (forceVoice) {
      // Handle voice modal - skip scanner entirely
      console.log('[SCAN][guard] Voice modal requested - skipping scanner');
      setVoiceModalOpen(true);
    } else if (forceHealth) {
      // Open the health analysis modal immediately
      console.log('[SCAN][guard] Health modal requested - skipping scanner');
      setHealthCheckModalOpen(true);
    }
  }, [forceHealth, forceVoice, source, barcode, name, modalParam, navigate]);

  // Handle voice-to-search custom event
  useEffect(() => {
    function onOpenSearch(e: any) {
      const { source, initialQuery } = (e?.detail ?? {}) as { source?: string; initialQuery?: string };
      console.log('[SCAN][OPEN-SEARCH]', { source, q: initialQuery ?? '' });

      // Put the hub into the search state and seed the query
      setCurrentState('search');
      setSearchState((s) => ({
        ...s,
        source: (source ?? 'voice') as 'voice' | 'manual',
        initialQuery: initialQuery ?? '',
        didInitVoice: true,
      }));
    }

    window.addEventListener('scan:open-search', onOpenSearch);
    return () => window.removeEventListener('scan:open-search', onOpenSearch);
  }, []);

  // Log page open
  console.log('scan_hub_open', { timestamp: Date.now() });

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-600 via-rose-700 to-slate-700 pb-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="relative isolate z-[70] text-center mb-8">
          <Button
            data-test="scan-back"
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('[HUB][BACK] invoked');
              const origin = (sessionStorage.getItem('scan-original-entry') || '').toLowerCase();
              // Normalize: only allow Home or Explore; everything else → Explore
              const dest =
                origin.includes('home') || origin === '/' ? '/' :
                '/explore';
              navigate(dest, { replace: true });
            }}
            className="absolute left-4 top-4 z-[80] pointer-events-auto text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="relative flex items-center justify-center">
            {/* Centered title */}
            <h1 className="text-4xl font-bold text-white mb-3">
              Health Scan
            </h1>
            {/* Activity icon positioned independently to the right */}
            <Activity className="absolute w-12 h-12 text-green-400 mb-3 animate-pulse 
              drop-shadow-[0_0_20px_rgba(34,197,94,0.8)] 
              drop-shadow-[0_0_40px_rgba(34,197,94,0.4)]
              filter brightness-110
              left-[calc(50%+120px)] pointer-events-none select-none" />
          </div>
          <p className="text-rose-100/80 text-lg">
            Choose how you want to analyze food
          </p>
        </div>

        {/* Grid of tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
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
        onClose={() => {
          console.log('[SCAN] Health modal closed');
          setHealthCheckModalOpen(false);
          handledRef.current = false;
          
          // Debug logging
          const originalEntry = originalEntryRef.current || sessionStorage.getItem('scan-original-entry');
          console.log('[SCAN] Original entry for navigation:', originalEntry);
          
          // Navigate back to original entry point to avoid saved/recent scans loop
          if (originalEntry && originalEntry !== '/scan') {
            console.log('[SCAN] Navigating to original entry:', originalEntry);
            sessionStorage.removeItem('scan-original-entry'); // Clear after use
            navigate(originalEntry, { replace: true });
          } else {
            console.log('[SCAN] Fallback navigation to home');
            navigate('/', { replace: true });
          }
        }}
        initialState={forceHealth ? 'loading' : 'scanner'}
        analysisData={forceHealth ? { source, barcode, name } : undefined}
      />

      <PhotoCaptureModal
        open={photoModalOpen}
        onOpenChange={setPhotoModalOpen}
        onCapture={handlePhotoCapture}
        onManualFallback={handlePhotoManualFallback}
      />

      {currentState === 'search' ? (
        <ImprovedManualEntry
          onProductSelected={(product) => {
            console.log('Search modal product selected:', product);
            addRecent({ mode: searchState.source, label: product.productName || 'Search entry' });
            setCurrentState('hub'); // Return to hub
            
            // Use the URL-based navigation to health analyzer
            import('@/lib/nav').then(({ goToHealthAnalysis }) => {
              goToHealthAnalysis(navigate, {
                source: 'off',
                barcode: product?.barcode || undefined,
                name: product?.productName || ''
              });
            });
          }}
          onBack={() => setCurrentState('hub')}
          initialQuery={searchState.initialQuery}
        />
      ) : manualEntryOpen && (
        <ImprovedManualEntry
          onProductSelected={handleManualProductSelected}
          onBack={() => setManualEntryOpen(false)}
        />
      )}

      <VoiceSearchModal
        open={voiceModalOpen}
        onOpenChange={(open) => {
          setVoiceModalOpen(open);
          if (!open) {
            handledRef.current = false;
            if (forceVoice) navigate('/scan', { replace: true });
          }
        }}
        onProductSelected={handleVoiceProductSelected}
      />
    </div>
  );
}