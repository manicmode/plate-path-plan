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
import { camHardStop } from '@/lib/camera/guardian';
import { useAutoImmersive } from '@/lib/uiChrome';
import { mealCaptureEnabledFromSearch } from '@/features/meal-capture/flags';


export default function ScanHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addRecent } = useScanRecents();

  // Guard: only run when meal capture flag is enabled
  useEffect(() => {
    if (!mealCaptureEnabledFromSearch(location.search)) return;

    const token = sessionStorage.getItem('mc:token');
    if (!token) return;

    // Check if we've already handled this token
    const handledKey = `mc:handled:${token}`;
    if (sessionStorage.getItem(handledKey)) return;

    // Don't navigate if already on meal capture routes
    if (location.pathname.startsWith("/meal-capture")) return;

    try {
      // Mark as handled immediately
      sessionStorage.setItem(handledKey, '1');
      
      // Navigate to meal capture entry with the token
      console.log("[MEAL][RESCUE]", { token });
      navigate(`/meal-capture/entry?token=${token}`, { replace: true });
      
      // Cleanup after successful navigation
      sessionStorage.removeItem('mc:token');
      sessionStorage.removeItem(handledKey);
      
    } catch (error) {
      console.error("[MEAL][RESCUE][ERROR]", error);
      // Clean up on error
      sessionStorage.removeItem('mc:token');
      sessionStorage.removeItem(handledKey);
    }
  }, [location.pathname, location.search, navigate]);
  
  // Do NOT hide bottom nav on the main Health Scan page
  // Only hide it when entering actual scanner interfaces
  // useAutoImmersive(true); // <- REMOVED: Health Scan page should show nav
  
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

  // Health modal state for unified analysis pipeline
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [healthModalStep, setHealthModalStep] = useState<'scanner' | 'loading' | 'report' | 'fallback' | 'no_detection' | 'not_found' | 'candidates' | 'meal_detection' | 'meal_confirm'>('scanner');

  // Feature flag checks
  const imageAnalyzerEnabled = isFeatureEnabled('image_analyzer_v1');
  const voiceEnabled = isFeatureEnabled('fallback_voice_enabled');
  const textEnabled = isFeatureEnabled('fallback_text_enabled');

  // Handle navigation state from NoDetectionFallback 
  useEffect(() => {
    if (location.state?.openPhotoModal && !photoModalOpen) {
      console.log('[SCAN] Opening photo modal from navigation state');
      setPhotoModalOpen(true);
      // Clear the state to prevent re-opening
      navigate(location.pathname, { replace: true, state: null });
    }
    if (location.state?.openManualEntry && !manualEntryOpen) {
      console.log('[SCAN] Opening manual entry from navigation state'); 
      setManualEntryOpen(true);
      // Clear the state to prevent re-opening
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, photoModalOpen, manualEntryOpen, navigate, location.pathname]);

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
    console.log('[HC][OPEN]', { from: 'barcode', initial: 'scanner' });
    setHealthCheckModalOpen(true);
  };

  const handleTakePhoto = () => {
    logTileClick('photo');
    
    // Don't auto-open photo modal while meal tokens exist
    const mealActive = mealCaptureEnabledFromSearch(location.search);
    const inflight = sessionStorage.getItem("mc:handoff:inflight") === "1";
    const hasToken = sessionStorage.getItem('mc:token') !== null;
    if (mealActive && (inflight || hasToken)) {
      return; // skip any "auto-open photo modal" effects
    }
    
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
  const handlePhotoCapture = (imageBase64: string) => {
    console.log('[PHOTO][CAPTURE]', { len: imageBase64?.length || 0 });

    // Close the capture UI
    setPhotoModalOpen(false);

    // Provide the image to Health modal
    const payload = {
      source: 'photo' as const,
      imageBase64,                 // <-- IMPORTANT
      captureTs: Date.now(),
    };

    setAnalysisData(payload);
    setHealthModalStep('loading'); // first view should be loading
    console.log('[HC][OPEN]', { from: 'photo', initial: 'loading' });

    setHealthCheckModalOpen(true);
  };

  // Handle photo fallback to manual
  const handlePhotoManualFallback = () => {
    setPhotoModalOpen(false);
    setManualEntryOpen(true);
  };

  // Handle manual entry product selection - use unified in-modal pipeline
  const handleManualProductSelected = (product: any) => {
    console.log('Manual product selected:', product);
    addRecent({ mode: 'manual', label: product.productName || 'Manual entry' });
    
    // Close manual entry and set analysis data BEFORE opening modal
    setManualEntryOpen(false);
    const analysisData = {
      source: 'manual',
      productName: product.productName || product.name,
      barcode: product.barcode,
      product: product
    };
    setAnalysisData(analysisData);
    setHealthModalStep('loading');
    console.log('[HC][OPEN]', { from: 'manual', initial: 'loading' });
    setHealthCheckModalOpen(true);
  };

  // Handle voice product selection - navigate directly to health analysis (No scanner for voice!)
  const handleVoiceProductSelected = (product: any) => {
    console.log('Voice product selected:', product);
    addRecent({ mode: 'voice', label: product.productName || 'Voice entry' });
    
    // Set analysis data BEFORE opening modal
    const payload = { 
      source: 'voice', 
      name: product.productName || product.name || '', 
      barcode: product?.barcode ?? null, 
      product: product 
    };
    setAnalysisData(payload);
    setHealthModalStep('loading');
    console.log('[HC][OPEN]', { from: 'voice', initial: 'loading' });
    setHealthCheckModalOpen(true);
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
          console.log('[SCAN] Health modal closed - staying on scan page');
          camHardStop('modal_close'); // Force stop before cleanup
          setHealthCheckModalOpen(false);
          setAnalysisData(null);
          setHealthModalStep('scanner');
          handledRef.current = false;
          // Always stay on /scan page when modal is closed/canceled
        }}
        initialState={
          forceHealth
            ? 'loading'
            : (analysisData?.source === 'photo' && (analysisData as any)?.imageBase64)
              ? 'loading'
              : (analysisData && analysisData.source !== 'photo')
                  ? 'loading'
                  : 'scanner'
        }
        analysisData={forceHealth ? { source, barcode, name } : analysisData}
      />

      <PhotoCaptureModal
        open={photoModalOpen}
        onOpenChange={setPhotoModalOpen}
        onCapture={handlePhotoCapture}
        onManualFallback={handlePhotoManualFallback}
      />

      {currentState === 'search' ? (
        <ImprovedManualEntry
          onProductSelected={(result) => {
            console.log('[SELECTION→MODAL][PAYLOAD]', {
              raw: result, 
              name: result?.name ?? result?.title ?? result?.product_name ?? null,
              brand: result?.brand ?? result?.brand_name ?? null
            });
            console.log('[SELECT→MODAL][OPEN]');
            console.log('[SELECT→MODAL][DATA]', { 
              source: 'manual', 
              name: result?.name ?? null, 
              barcode: result?.barcode ?? null, 
              hasProduct: !!result 
            });
            
            addRecent({ mode: searchState.source, label: result.productName || result.name || 'Search entry' });
            setCurrentState('hub'); // Return to hub
            
            // Set analysis data BEFORE opening modal
            const analysisData = {
              source: 'manual',
              name: result?.name ?? null,
              barcode: result?.barcode ?? null,
              product: result ?? null
            };
            setAnalysisData(analysisData);
            setHealthModalStep('loading');
            console.log('[HC][OPEN]', { from: 'manual', initial: 'loading' });
            console.log('[MODAL][OPEN][FROM_SELECTION]', { analysisData });
            setHealthCheckModalOpen(true);
          }}
          onBack={() => setCurrentState('hub')}
          initialQuery={searchState.initialQuery}
        />
      ) : manualEntryOpen && (
        <ImprovedManualEntry
          onProductSelected={(result) => {
            console.log('[SELECTION→MODAL][PAYLOAD]', {
              raw: result, 
              name: result?.name ?? result?.title ?? result?.product_name ?? null,
              brand: result?.brand ?? result?.brand_name ?? null
            });
            console.log('[SELECT→MODAL][OPEN]');
            console.log('[SELECT→MODAL][DATA]', { 
              source: 'manual', 
              name: result?.name ?? null, 
              barcode: result?.barcode ?? null, 
              hasProduct: !!result 
            });
            
            addRecent({ mode: 'manual', label: result.productName || result.name || 'Manual entry' });
            setManualEntryOpen(false);
            
            // Set analysis data BEFORE opening modal
            const analysisData = {
              source: 'manual',
              name: result?.name ?? null,
              barcode: result?.barcode ?? null,
              product: result ?? null
            };
            setAnalysisData(analysisData);
            setHealthModalStep('loading');
            console.log('[HC][OPEN]', { from: 'manual', initial: 'loading' });
            console.log('[MODAL][OPEN][FROM_SELECTION]', { analysisData });
            setHealthCheckModalOpen(true);
          }}
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