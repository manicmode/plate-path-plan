
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Upload, ArrowRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBodyScanNotifications } from '@/hooks/useBodyScanNotifications';
import ScanTipsModal from '@/components/ScanTipsModal';
import { validateImageFile, getImageDimensions } from '@/utils/imageValidation';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/useSound';
import { supabase } from '@/integrations/supabase/client';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import sideViewSilhouette from '@/assets/side-view-silhouette.png';

// Pose detection types
interface PoseKeypoint {
  x: number;
  y: number;
  score: number;
  name: string;
}

interface DetectedPose {
  keypoints: PoseKeypoint[];
  score: number;
}

interface AlignmentFeedback {
  isAligned: boolean;
  misalignedLimbs: string[];
  alignmentScore: number;
  feedback: string;
}

export default function BodyScanAI() {
  // Enhanced 3-step guided scan state
  const [currentStep, setCurrentStep] = useState<'front' | 'side' | 'back'>('front');
  const [capturedImages, setCapturedImages] = useState<{
    front?: string;
    side?: string;
    back?: string;
  }>({});
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weight, setWeight] = useState('');
  const [isCompletingScan, setIsCompletingScan] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showStepSuccess, setShowStepSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const poseDetectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playBodyScanCapture } = useSound();
  const { triggerScanCompletedNotification, showInstantFeedback, showPoseQualityFeedback, getTipsModal } = useBodyScanNotifications();
  const tipsModal = getTipsModal();
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasImageReady, setHasImageReady] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>('environment');
  const [showOrientationWarning, setShowOrientationWarning] = useState(false);
  
  // Pose detection state
  const [poseDetected, setPoseDetected] = useState<DetectedPose | null>(null);
  const [alignmentFeedback, setAlignmentFeedback] = useState<AlignmentFeedback | null>(null);
  const [isPoseDetectionEnabled, setIsPoseDetectionEnabled] = useState(true);
  const [poseDetectionReady, setPoseDetectionReady] = useState(false);
  
  // Simple alignment confirmation system
  const [alignmentFrameCount, setAlignmentFrameCount] = useState(0);
  const [alignmentConfirmed, setAlignmentConfirmed] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  
  const [isSaving, setIsSaving] = useState(false);
  const [savedScanUrl, setSavedScanUrl] = useState<string | null>(null);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [errorSavingScan, setErrorSavingScan] = useState<string | null>(null);
  
  // Enhanced transition states for smooth UX
  const [isScanningFadingOut, setIsScanningFadingOut] = useState(false);
  const [showShutterFlash, setShowShutterFlash] = useState(false);
  const [showNudgeText, setShowNudgeText] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        // ✅ 1. Ensure video element is created and mounted
        console.log("[VIDEO INIT] videoRef =", videoRef.current);
        if (!videoRef.current) {
          console.error("[VIDEO] videoRef is null — video element not mounted");
          return;
        }

        // ✅ 3. Confirm HTTPS is enforced on mobile
        if (location.protocol !== 'https:') {
          console.warn("[SECURITY] Camera requires HTTPS — current protocol:", location.protocol);
        }

        // ✅ 4. Confirm camera permissions
        if (navigator.permissions) {
          navigator.permissions.query({ name: 'camera' as PermissionName }).then((res) => {
            console.log("[PERMISSION] Camera permission state:", res.state);
          }).catch((err) => {
            console.log("[PERMISSION] Could not query camera permission:", err);
          });
        }

        // ✅ 2. CAMERA REQUEST LOGGING
        console.log("[CAMERA] Requesting camera stream...");
        
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { exact: cameraMode },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        });
        
        // ✅ 3. STREAM RECEIVED LOGGING
        console.log("[CAMERA] Stream received:", mediaStream);
        console.log("[CAMERA] Video element srcObject set");
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          // ✅ 5. Visually confirm that the <video> tag is rendering
          videoRef.current.style.border = "2px solid red";
          
          console.log("[CAMERA] srcObject set, playing video");
          
          // ✅ 5. VIDEO PLAY WITH LOGGING
          videoRef.current.play().then(() => {
            console.log("[CAMERA] Video playing");
          }).catch((e) => {
            console.error("[CAMERA] Error playing video", e);
          });
        } else {
          console.error("[CAMERA] videoRef.current is null");
        }
        setStream(mediaStream);
      } catch (error) {
        // ✅ 4. CAMERA ACCESS ERROR HANDLING
        console.error("[CAMERA FAIL] getUserMedia error:", error);
        console.error("[CAMERA] Access denied or failed", error);
        toast({
          title: "❌ Camera access denied or failed",
          description: "[CAMERA ERROR] " + (error as Error).message,
          variant: "destructive"
        });
      }
    };

    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraMode]);

  // Handle video metadata loading for proper canvas sizing
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      console.log(`Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
      
      // Set canvas dimensions once video metadata is available
      if (overlayCanvasRef.current && video.videoWidth > 0 && video.videoHeight > 0) {
        overlayCanvasRef.current.width = video.videoWidth;
        overlayCanvasRef.current.height = video.videoHeight;
        console.log(`Canvas initialized to ${video.videoWidth}x${video.videoHeight}`);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // If metadata is already loaded, call handler immediately
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [stream]);

  // Trigger save when image is ready
  useEffect(() => {
    if (hasImageReady) {
      console.log("🟢 Pose ready, saving scan");
      saveBodyScanToSupabase(capturedImage!);
    }
  }, [hasImageReady]);

  // Clear canvas overlay when success screen shows
  useEffect(() => {
    if (showSuccessScreen && overlayCanvasRef.current) {
      const canvas = overlayCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        console.log('🧹 Clearing canvas overlay for success screen');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [showSuccessScreen]);

  // Show nudge text after 1.5 seconds if user pauses on success screen
  useEffect(() => {
    let nudgeTimer: NodeJS.Timeout;
    if (showSuccessScreen) {
      setShowNudgeText(false);
      nudgeTimer = setTimeout(() => {
        setShowNudgeText(true);
      }, 1500);
    } else {
      setShowNudgeText(false);
    }
    return () => {
      if (nudgeTimer) clearTimeout(nudgeTimer);
    };
  }, [showSuccessScreen]);

  useEffect(() => {
    // Lock screen orientation to portrait if supported
    const lockOrientation = async () => {
      try {
        if ('orientation' in screen && 'lock' in screen.orientation) {
          await (screen.orientation as any).lock('portrait');
        }
      } catch (error) {
        console.log('Orientation lock not supported:', error);
      }
    };

    // Handle orientation change for unsupported devices
    const handleOrientationChange = () => {
      if (window.innerHeight < window.innerWidth) {
        setShowOrientationWarning(true);
      } else {
        setShowOrientationWarning(false);
      }
    };

    lockOrientation();
    handleOrientationChange();
    
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      
      // Unlock orientation when leaving the page
      try {
        if ('orientation' in screen && 'unlock' in screen.orientation) {
          (screen.orientation as any).unlock();
        }
      } catch (error) {
        console.log('Orientation unlock not supported:', error);
      }
    };
  }, []);

  useEffect(() => {
    const initializePoseDetection = async () => {
      try {
        console.log('=== POSE DETECTION INITIALIZATION START ===');

        // PHASE 1: Environment Diagnostics
        console.log('[DIAGNOSTIC] Window location:', window.location.href);
        console.log('[DIAGNOSTIC] User agent:', navigator.userAgent);
        console.log('[DIAGNOSTIC] Online status:', navigator.onLine);

        // PHASE 2: TensorFlow State Analysis
        console.log('[VERSION] TensorFlow:', tf.version.tfjs);
        console.log('[TFJS] Version:', tf.version);
        console.log('[TFJS] Current backend before ready:', tf.getBackend());
        console.log('[TFJS] Available backends:', tf.engine().backendNames);
        console.log('[TFJS] Memory info:', tf.memory());

        // PHASE 3: Clean Slate
        console.log('[CLEANUP] Disposing any existing variables...');
        tf.disposeVariables();

        // PHASE 4: Backend Initialization with Timing
        console.log('[BACKEND] Waiting for tf.ready()...');
        const readyStart = performance.now();
        await tf.ready();
        const readyEnd = performance.now();
        console.log(`[BACKEND] tf.ready() completed in ${(readyEnd - readyStart).toFixed(2)}ms`);

        console.log('[BACKEND] Current backend after ready:', tf.getBackend());

        // PHASE 5: Force WebGL Backend
        console.log('[BACKEND] Setting backend to webgl...');
        const backendStart = performance.now();
        await tf.setBackend('webgl');
        const backendEnd = performance.now();
        console.log(`[BACKEND] Backend set in ${(backendEnd - backendStart).toFixed(2)}ms`);
        console.log('[BACKEND] Final backend:', tf.getBackend());

        // PHASE 6: Pose Detection Library Analysis
        console.log('[POSE LIB] SupportedModels:', Object.keys(poseDetection.SupportedModels));
        console.log('[POSE LIB] MoveNet config:', poseDetection.movenet);
        console.log('[VERSION] PoseDetection:', 'n/a');

        // PHASE 7: Model Configuration Analysis
        const modelConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
        };
        console.log('[MODEL CONFIG] Configuration object:', JSON.stringify(modelConfig, null, 2));

        // PHASE 8: Network Connectivity Test
        console.log('[NETWORK] Testing connectivity to TensorFlow Hub...');
        try {
          const testResponse = await fetch('https://tfhub.dev', {
            method: 'HEAD',
            mode: 'no-cors'
          });
          console.log('[NETWORK] TensorFlow Hub connectivity test completed');
        } catch (networkError) {
          console.error('[NETWORK] TensorFlow Hub connectivity failed:', networkError);
        }

        // PHASE 9: Clear Cache and Model Creation with Detailed Monitoring
        console.log('[MODEL] Clearing TensorFlow.js model cache...');
        await tf.disposeVariables();
        
        console.log('[MODEL] Adding delay for backend readiness...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('[MODEL] Starting model creation...');
        console.log('[MODEL] Using SupportedModels.MoveNet:', poseDetection.SupportedModels.MoveNet);

        const modelStart = performance.now();

        // Monitor any network requests during model loading
        const originalFetch = window.fetch;
        window.fetch = function (...args) {
          console.log('[NETWORK REQUEST]', args[0]);
          return originalFetch.apply(this, args);
        };

        const model = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
            modelUrl: undefined  // Force default model behavior
          }
        );

        // Restore fetch
        window.fetch = originalFetch;

        const modelEnd = performance.now();
        console.log(`[MODEL] Model created successfully in ${(modelEnd - modelStart).toFixed(2)}ms`);

        console.log('[MODEL] Model type:', typeof model);
        console.log('[MODEL] Model constructor:', model.constructor.name);
        console.log('[MODEL] Model methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(model)));

        if (typeof model.estimatePoses === 'function') {
          console.log('[MODEL] ✅ estimatePoses method is available');
        } else {
          console.error('[MODEL] ❌ estimatePoses method is missing');
        }

        poseDetectorRef.current = model;
        setPoseDetectionReady(true);

        console.log('=== POSE DETECTION INITIALIZATION SUCCESS ===');

        toast({
          title: "✅ Pose Detection Ready",
          description: "AI-powered pose alignment is now active",
        });

      } catch (error) {
        console.error('=== POSE DETECTION INITIALIZATION FAILED ===');
        console.error('[ERROR] Type:', error.constructor.name);
        console.error('[ERROR] Message:', error.message);
        console.error('[ERROR] Stack:', error.stack);

        if (error.message.includes('kaggle.com')) {
          console.error('[ERROR ANALYSIS] Kaggle fallback triggered!');
          console.error('[ERROR ANALYSIS] Possible causes: CSP block, fallback config, network');
        }

        toast({
          title: "❌ Pose detection failed",
          description: `Error: ${error.message}`,
          variant: "destructive",
        });

        setIsPoseDetectionEnabled(false);
      }
    };

    initializePoseDetection();

    return () => {
      if (poseDetectorRef.current) {
        console.log('[CLEANUP] Disposing pose detector');
        try {
          poseDetectorRef.current.dispose();
        } catch (disposeError) {
          console.warn('[CLEANUP] Dispose error:', disposeError);
        }
      }
    };
  }, []);

  // Enhanced step transitions with cinematic effects
  useEffect(() => {
    if (currentStep) {
      // Start transition animation
      setIsTransitioning(true);
      
      // Reset all step-specific states
      setAlignmentConfirmed(false);
      setCountdownSeconds(0);
      setIsCountingDown(false);
      setPoseDetected(null);
      setAlignmentFeedback({ 
        isAligned: false, 
        misalignedLimbs: [], 
        alignmentScore: 0, 
        feedback: 'Getting ready...' 
      });
      setCapturedImage(null);
      setHasImageReady(false);
      setShowSuccessScreen(false);
      setShowStepSuccess(false);
      
      // Cinematic step introduction
      setTimeout(() => {
        setIsTransitioning(false);
        const stepIntros = {
          front: { emoji: '👤', title: 'Front View', desc: 'Face the camera directly' },
          side: { emoji: '🚶', title: 'Side Profile', desc: 'Turn sideways to the right' },
          back: { emoji: '🔄', title: 'Back View', desc: 'Turn around completely' }
        };
        
        const intro = stepIntros[currentStep];
        toast({
          title: `${intro.emoji} ${intro.title} Body Scan`,
          description: intro.desc,
          duration: 4000,
        });
      }, 500);
    }
  }, [currentStep]);

  // Clean pose detection loop with debug logging
  useEffect(() => {
    const detectPoseRealTime = async () => {
      // STEP 1: VIDEO DEBUG CHECK
      console.log("[VIDEO]", videoRef.current);
      if (videoRef.current?.readyState !== 4) {
        console.log("[VIDEO] Not ready", videoRef.current?.readyState);
        animationFrameRef.current = requestAnimationFrame(detectPoseRealTime);
        return;
      }
      
      // STEP 8: VIDEO STREAM DIMENSIONS
      console.log("[VIDEO STREAM] Width:", videoRef.current.videoWidth, "Height:", videoRef.current.videoHeight);
      
      // ✅ 5. CRITICAL GUARD: Stop all detection during success transitions
      if (showSuccessScreen || isScanningFadingOut) {
        console.log("🟡 Fade-out started - stopping pose detection");
        // Cancel animation frame to stop the loop
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return; // Don't schedule another frame during transitions
      }
      
      if (!videoRef.current || !poseDetectorRef.current || !isPoseDetectionEnabled || !poseDetectionReady || hasImageReady) {
        animationFrameRef.current = requestAnimationFrame(detectPoseRealTime);
        return;
      }

      const video = videoRef.current;
      const overlayCanvas = overlayCanvasRef.current;

      // STEP 2: ANIMATION LOOP DEBUG
      console.log("[LOOP] Running frame", Date.now());

      try {
        console.log('[POSE FRAME] Attempting pose detection...');
        
        // STEP 9: CONFIRM MODEL INFERENCE
        console.log("[ESTIMATE] About to run estimatePoses");
        
        // Detect pose using estimatePoses (MoveNet method)
        const poses = await poseDetectorRef.current.estimatePoses(video);
        
        // STEP 6: LOG POSE RESULT
        console.log("[POSE RESULT]", poses);
        console.log('[POSE FRAME] Number of poses detected:', poses.length);
        
        // STEP 7: LOG KEYPOINTS DETAILS
        if (poses.length > 0) {
          const keypoints = poses[0].keypoints || [];
          console.log("[KEYPOINTS] Count:", keypoints.length);
          keypoints.forEach((kp, i) => {
            console.log(`[KEYPOINT ${i}] ${kp.name || i}:`, kp);
          });
        } else {
          console.log("[KEYPOINTS] No pose detected");
          
          // STEP 10: RED WARNING TOAST
          toast({
            title: "❌ Pose NOT detected",
            description: "Check camera & lighting",
            variant: "destructive"
          });
        }
        
        if (poses.length > 0) {
          const pose = poses[0] as DetectedPose;
          setPoseDetected(pose);
          
          console.log('[POSE FRAME] Using pose with', pose.keypoints.length, 'keypoints, score:', pose.score?.toFixed(3));
          
          // Analyze alignment
          const alignment = analyzePoseAlignment(pose);
          setAlignmentFeedback(alignment);
          
          console.log('[POSE FRAME] Alignment result:', alignment.isAligned, 'score:', alignment.alignmentScore?.toFixed(3));
          
          // Simple 5-frame alignment confirmation
          if (alignment.isAligned) {
            setAlignmentFrameCount(prev => {
              const newCount = prev + 1;
              console.log('[POSE FRAME] ✅ Aligned frame count:', newCount);
              
              if (newCount >= 5 && !alignmentConfirmed) {
                setAlignmentConfirmed(true);
                console.log('[POSE FRAME] 🎯 ALIGNMENT CONFIRMED after 5 frames');
              }
              
              return newCount;
            });
          } else {
            setAlignmentFrameCount(0);
            if (alignmentConfirmed) {
              setAlignmentConfirmed(false);
              console.log('[POSE FRAME] ❌ Alignment lost - resetting confirmation');
            }
          }
          
          console.log('[POSE FRAME] Calling drawPoseOverlay...');
          drawPoseOverlay(pose, alignment);
          
        } else {
          setPoseDetected(null);
          setAlignmentFeedback(null);
          setAlignmentFrameCount(0);
          setAlignmentConfirmed(false);
          
          console.log('[POSE FRAME] 👻 No pose detected - clearing overlay');
          
          // Clear overlay canvas
          if (overlayCanvas) {
            const ctx = overlayCanvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            }
          }
        }
      } catch (error) {
        console.error('[POSE FRAME] ❌ Pose detection error:', error);
      }

      animationFrameRef.current = requestAnimationFrame(detectPoseRealTime);
    };

    if (stream && poseDetectionReady && isPoseDetectionEnabled) {
      console.log('[POSE FRAME] 🚀 Starting pose detection loop');
      animationFrameRef.current = requestAnimationFrame(detectPoseRealTime);
    }

    return () => {
      if (animationFrameRef.current) {
        console.log('[POSE FRAME] 🛑 Cleaning up animation frame');
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stream, poseDetectionReady, isPoseDetectionEnabled, showSuccessScreen, isScanningFadingOut]);

  // Start countdown when alignment is confirmed
  useEffect(() => {
    if (alignmentConfirmed && !isCountingDown && !hasImageReady) {
      console.log('🚀 STARTING COUNTDOWN - alignment confirmed');
      setIsCountingDown(true);
      setCountdownSeconds(3);
    }
  }, [alignmentConfirmed, isCountingDown, hasImageReady]);

  // Countdown timer
  useEffect(() => {
    if (isCountingDown && countdownSeconds > 0) {
      console.log('⏰ Countdown:', countdownSeconds);
      
      const timer = setTimeout(() => {
        setCountdownSeconds(prev => {
          if (prev <= 1) {
            console.log('📸 COUNTDOWN COMPLETE - triggering capture');
            setIsCountingDown(false);
            playBodyScanCapture();
            captureImage();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isCountingDown, countdownSeconds]);

  // Reset countdown if alignment is lost
  useEffect(() => {
    if (isCountingDown && !alignmentConfirmed) {
      console.log('🛑 COUNTDOWN RESET - alignment lost');
      setIsCountingDown(false);
      setCountdownSeconds(0);
    }
  }, [isCountingDown, alignmentConfirmed]);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { exact: cameraMode },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.log('Video autoplay prevented, will play on user interaction');
        }
      }
      setStream(mediaStream);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions and try again.",
        variant: "destructive"
      });
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    console.log('📸 Capture attempt - checking alignment...');
    
    // STRICT VALIDATION: Only capture if alignment is true
    if (isPoseDetectionEnabled && (!alignmentFeedback || !alignmentFeedback.isAligned)) {
      console.log('❌ CAPTURE BLOCKED - alignment not satisfied:', {
        hasAlignmentFeedback: !!alignmentFeedback,
        isAligned: alignmentFeedback?.isAligned,
        feedback: alignmentFeedback?.feedback
      });
      
      toast({
        title: "Pose Alignment Required",
        description: alignmentFeedback?.feedback || "Please align your pose before capturing",
        variant: "destructive"
      });
      return;
    }
    
    console.log('✅ CAPTURE APPROVED - alignment satisfied');
    
    try {
      setIsCapturing(true);
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageDataUrl);
      setHasImageReady(true);
      
      console.log('📷 Image captured successfully');
      
      await saveBodyScanToSupabase(imageDataUrl);
      
    } catch (error) {
      console.error('❌ Capture error:', error);
      toast({
        title: "Capture Failed",
        description: "Failed to capture image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCapturing(false);
    }
  };
  // Helper function to upload blob to Supabase
  const uploadBodyScan = async (blob: Blob) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("❌ User not authenticated");
        throw new Error('User not authenticated');
      }
      
      console.log("✅ User authenticated:", user.id);

      // Create filename with timestamp
      const timestamp = Date.now();
      const fileName = `${user.id}/${currentStep}-${timestamp}.jpg`;
      
      console.log("🔄 Uploading to Supabase Storage:", fileName);
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('body-scans')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error("❌ Upload error:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      console.log("✅ Upload successful:", uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('body-scans')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      console.log("✅ Public URL generated:", publicUrl);
      
      // Store the captured image URL
      setCapturedImages(prev => ({
        ...prev,
        [currentStep]: publicUrl
      }));
      setCompletedSteps(prev => new Set([...prev, currentStep]));

      console.log("✅ Scan saved, publicUrl:", publicUrl);
      
      // Enhanced cinematic transition sequence
      console.log('🎬 Starting cinematic transition sequence...');
      
      // 🎬 OPTIMIZED CINEMATIC TIMELINE:
      // 0ms: Start fade-out + stop pose detection
      console.log('🟡 Fade-out started');
      setIsScanningFadingOut(true);
      setHasImageReady(true);
      
      // 100ms: Clear canvas immediately to prevent pose dots
      setTimeout(() => {
        if (overlayCanvasRef.current) {
          const ctx = overlayCanvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
            console.log('⚪ Canvas cleared');
          }
        }
      }, 100);
      
      // 200ms: Show flash (150ms duration with smooth fade)
      setTimeout(() => {
        console.log('💡 Flash ON');
        setShowShutterFlash(true);
        setTimeout(() => {
          setShowShutterFlash(false);
        }, 150);
      }, 200);
      
      // 450ms: Show success popup (after flash disappears)
      setTimeout(() => {
        setSavedScanUrl(publicUrl);
        setShowSuccessScreen(true);
        console.log('🎉 Popup shown');
      }, 450);
      
      // 700ms: Reset scanning state for next scan
      setTimeout(() => {
        setIsScanningFadingOut(false);
        console.log('🔄 Scanning state reset at 700ms');
      }, 700);
      
      console.log('✅ Showing Success Screen');
      console.log('🎯 Success screen should now be visible:', { 
        savedScanUrl: !!publicUrl, 
        showSuccessScreen: true, 
        currentStep 
      });
      
      // Show pose quality feedback
      if (alignmentFeedback) {
        showPoseQualityFeedback({
          poseScore: alignmentFeedback.alignmentScore,
          poseMetadata: {
            shouldersLevel: !alignmentFeedback.misalignedLimbs.includes('shoulders'),
            armsRaised: !(alignmentFeedback.misalignedLimbs.includes('left_arm') || alignmentFeedback.misalignedLimbs.includes('right_arm')),
            alignmentScore: Math.round(alignmentFeedback.alignmentScore * 100),
            misalignedLimbs: alignmentFeedback.misalignedLimbs
          }
        }, currentStep);
      }

      toast({
        title: `✅ ${currentStep.charAt(0).toUpperCase() + currentStep.slice(1)} scan saved!`,
        description: "Great pose! Ready for next step.",
      });

    } catch (error) {
      console.error("📛 Error uploading body scan:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Upload error details:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        currentStep,
        blobSize: blob.size,
        blobType: blob.type
      });
      
      setErrorSavingScan(errorMessage);
      alert(`Upload failed: ${errorMessage}`);
      toast({
        title: "Upload Error",
        description: `Failed to upload body scan: ${errorMessage}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Function to capture and save body scan - bulletproof canvas.toBlob() with iOS reliability
  const saveBodyScanToSupabase = async (imageDataUrl: string) => {
    console.log("📸 Starting saveBodyScanToSupabase");
    
    try {
      setIsSaving(true);
      setErrorSavingScan(null);
      
      // ✅ 1. Add image data URL validation before processing
      if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image')) {
        console.error('❌ Invalid or empty image dataUrl:', imageDataUrl);
        alert("Body scan failed due to camera capture issue. Please ensure the outline is visible and try again.");
        setErrorSavingScan("Invalid image data");
        setIsSaving(false);
        return;
      }
      console.log("📸 Image data URL starts with:", imageDataUrl?.substring(0, 100));
      
      // ✅ CANVAS STABILITY & RENDERING VALIDATION
      const canvas = canvasRef.current;
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        console.error("Canvas not ready or has invalid dimensions", { 
          canvas: !!canvas,
          width: canvas?.width || 0,
          height: canvas?.height || 0,
          canvasContext: canvas?.getContext("2d") ? "available" : "null",
          documentVisibility: document.visibilityState
        });
        alert("Body scan failed due to camera capture issue. Please ensure the outline is visible and try again.");
        setErrorSavingScan("Canvas not ready");
        setIsSaving(false);
        return;
      }

      console.log("✅ Canvas validation passed:", { 
        width: canvas.width, 
        height: canvas.height,
        context: !!canvas.getContext("2d"),
        documentState: document.visibilityState
      });

      // Force a brief delay after rendering the canvas for mobile Safari/iOS
      console.log("⏳ Adding iOS compatibility delay...");
      await new Promise(resolve => setTimeout(resolve, 100));

      // ✅ toBlob() SAFETY AND TIMEOUT - wrap in timeout-safe promise
      const blob: Blob = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Canvas toBlob timeout")), 3000);
        
        canvas.toBlob(blob => {
          clearTimeout(timeout);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas toBlob returned null"));
          }
        }, "image/jpeg", 0.95);
      });

      // Validate the blob size after generation
      if (blob.size < 1000) {
        console.error("Generated blob too small. Likely capture failed.", { size: blob.size });
        alert("Body scan failed due to camera capture issue. Please ensure the outline is visible and try again.");
        setErrorSavingScan("Image capture failed");
        setIsSaving(false);
        return;
      }

      console.log("✅ Blob created successfully:", {
        size: blob.size,
        type: blob.type
      });

      // ✅ Continue with Supabase upload
      await uploadBodyScan(blob);

    } catch (error) {
      // ✅ EXTRA DEBUGGING and improved error logging
      console.error("📛 Error saving body scan:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Full error details:", {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        currentStep,
        hasImageReady,
        imageDataLength: imageDataUrl?.length || 0,
        canvasReady: !!canvasRef.current,
        canvasDimensions: canvasRef.current ? {
          width: canvasRef.current.width,
          height: canvasRef.current.height
        } : null,
        canvasContext: canvasRef.current?.getContext("2d") ? "available" : "null",
        documentVisibility: document.visibilityState
      });
      
      setErrorSavingScan(errorMessage);
      alert("Body scan failed due to camera capture issue. Please ensure the outline is visible and try again.");
      toast({
        title: "Save Error",
        description: `Body scan failed due to camera capture issue. Please ensure the outline is visible and try again.`,
        variant: "destructive"
      });
      setIsSaving(false);
    }
  };

  // Complete the full body scan with weight
  const completeFullBodyScan = async () => {
    if (!weight.trim()) {
      toast({
        title: "Weight Required",
        description: "Please enter your current weight",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCompletingScan(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Calculate scan index for the year
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      const { data: existingScans } = await supabase
        .from('body_scans')
        .select('scan_index')
        .eq('user_id', user.id)
        .eq('year', currentYear)
        .order('scan_index', { ascending: false })
        .limit(1);

      const nextScanIndex = existingScans && existingScans.length > 0 ? existingScans[0].scan_index + 1 : 1;

      // Save complete body scan record
      const { error: dbError } = await supabase
        .from('body_scans')
        .insert({
          user_id: user.id,
          image_url: capturedImages.front || '', // Required field
          side_image_url: capturedImages.side,
          back_image_url: capturedImages.back,
          weight: parseFloat(weight),
          scan_index: nextScanIndex,
          year: currentYear,
          month: currentMonth,
          type: 'complete'
        });

      if (dbError) throw dbError;

      // Update body scan reminder
      await supabase.rpc('update_body_scan_reminder', {
        p_user_id: user.id,
        p_scan_date: new Date().toISOString()
      });

      // Show success and navigate
      toast({
        title: "🎉 Body Scan Complete!",
        description: "Your full body scan has been saved. You'll be reminded to scan again in 30 days.",
        duration: 5000,
      });

      setTimeout(() => {
        navigate('/exercise-hub');
      }, 2000);

    } catch (error) {
      console.error('Error completing body scan:', error);
      toast({
        title: "Error",
        description: "Failed to complete body scan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCompletingScan(false);
    }
  };

  const handleRetake = () => {
    console.log('🔄 Retaking scan - resetting all state');
    setCapturedImage(null);
    setHasImageReady(false);
    setSavedScanUrl(null);
    setShowSuccessScreen(false);
    setAlignmentFrameCount(0);
    setAlignmentConfirmed(false);
    setIsCountingDown(false);
    setCountdownSeconds(0);
  };

  // Enhanced human presence validation with pose smoothing
  const validateHumanPresence = useCallback((pose: DetectedPose): { level: 'none' | 'partial' | 'full', validCount: number, avgConfidence: number } => {
    const majorLandmarks = [
      'nose', 'left_shoulder', 'right_shoulder', 'left_hip', 'right_hip',
      'left_knee', 'right_knee', 'left_elbow', 'right_elbow'
    ];
    
    let validCount = 0;
    let totalConfidence = 0;
    const confidenceThreshold = 0.4; // Relaxed from 0.6
    
    for (const landmarkName of majorLandmarks) {
      const landmark = pose.keypoints.find(kp => kp.name === landmarkName);
      if (landmark && landmark.score > confidenceThreshold) {
        validCount++;
        totalConfidence += landmark.score;
      }
    }
    
    const avgConfidence = validCount > 0 ? totalConfidence / validCount : 0;
    
    // Tiered validation: relaxed requirements
    let level: 'none' | 'partial' | 'full' = 'none';
    if (validCount >= 6) { // Reduced from 8 to 6
      level = 'full';
    } else if (validCount >= 4) { // Allow partial detection
      level = 'partial';
    }
    
    // Enhanced debugging with frame-by-frame analysis
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Human Presence Analysis:
        Valid landmarks: ${validCount}/${majorLandmarks.length}
        Avg confidence: ${(avgConfidence * 100).toFixed(1)}%
        Presence level: ${level}
        Detected landmarks: ${pose.keypoints.filter(kp => kp.score > confidenceThreshold).map(kp => kp.name).join(', ')}
      `);
    }
    
    return { level, validCount, avgConfidence };
  }, []);

  // Simplified pose data function (removed smoothing dependencies)
  const smoothPoseData = useCallback((currentPose: DetectedPose) => {
    // For now, return current pose without smoothing to avoid missing state dependencies
    return currentPose;
  }, []);

  // Enhanced pose analysis with comprehensive validation
  const analyzePoseAlignment = useCallback((pose: DetectedPose): AlignmentFeedback => {
    // STEP 1: Enhanced human presence validation with tiered levels
    const presenceCheck = validateHumanPresence(pose);
    
    // Immediate return for no human detected
    if (presenceCheck.level === 'none') {
      return {
        isAligned: false,
        misalignedLimbs: ['no_human'],
        alignmentScore: 0,
        feedback: "No person detected. Step into view to begin."
      };
    }
    
    // Partial human detection - give encouraging feedback
    if (presenceCheck.level === 'partial') {
      return {
        isAligned: false,
        misalignedLimbs: ['partial_detection'],
        alignmentScore: Math.min(0.4, presenceCheck.avgConfidence), // Cap at 40% for partial detection
        feedback: `Getting there! Move closer or adjust position. (${presenceCheck.validCount}/9 landmarks detected)`
      };
    }
    
    // Apply pose smoothing for full human detection
    const smoothedPose = smoothPoseData(pose);
    
    // Find key landmarks
    const keypoints = pose.keypoints;
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
    const leftWrist = keypoints.find(kp => kp.name === 'left_wrist');
    const rightWrist = keypoints.find(kp => kp.name === 'right_wrist');
    const leftHip = keypoints.find(kp => kp.name === 'left_hip');
    const rightHip = keypoints.find(kp => kp.name === 'right_hip');
    const nose = keypoints.find(kp => kp.name === 'nose');
    
    // SIDE POSE VALIDATION - Check if user is turned fully sideways
    if (currentStep === 'side') {
      console.log('🔄 SIDE POSE VALIDATION ACTIVE');
      
      const misalignedLimbs: string[] = [];
      let feedback = "";
      
      // Calculate horizontal distances for sideways validation
      let shoulderDistance = 0;
      let hipDistance = 0;
      let isShouldersSideways = false;
      let isHipsSideways = false;
      
      // Check shoulder alignment for side pose
      if (leftShoulder && rightShoulder && leftShoulder.score > 0.5 && rightShoulder.score > 0.5) {
        shoulderDistance = Math.abs(leftShoulder.x - rightShoulder.x);
        isShouldersSideways = shoulderDistance < 50; // 50px threshold
        
        if (!isShouldersSideways) {
          misalignedLimbs.push('shoulders_not_sideways');
        }
      } else {
        misalignedLimbs.push('shoulders_not_detected');
      }
      
      // Check hip alignment for side pose
      if (leftHip && rightHip && leftHip.score > 0.5 && rightHip.score > 0.5) {
        hipDistance = Math.abs(leftHip.x - rightHip.x);
        isHipsSideways = hipDistance < 50; // 50px threshold
        
        if (!isHipsSideways) {
          misalignedLimbs.push('hips_not_sideways');
        }
      } else {
        misalignedLimbs.push('hips_not_detected');
      }
      
      // Debug logging for side pose validation
      console.log('📊 SIDE POSE DEBUG:', {
        shoulderDistance: shoulderDistance.toFixed(1) + 'px',
        hipDistance: hipDistance.toFixed(1) + 'px',
        isShouldersSideways,
        isHipsSideways,
        misalignedLimbs,
        leftShoulderScore: leftShoulder?.score,
        rightShoulderScore: rightShoulder?.score,
        leftHipScore: leftHip?.score,
        rightHipScore: rightHip?.score
      });
      
      // Check body centering for side pose
      let isCentered = true;
      if (leftHip && rightHip && leftHip.score > 0.5 && rightHip.score > 0.5) {
        const hipCenter = (leftHip.x + rightHip.x) / 2;
        const screenCenter = (videoRef.current?.videoWidth || 640) / 2;
        const centerOffset = Math.abs(hipCenter - screenCenter) / screenCenter;
        
        if (centerOffset > 0.25) { // More lenient for side pose
          misalignedLimbs.push('centering');
          isCentered = false;
        }
      }
      
      // Determine if side pose is aligned
      const isSidePoseAligned = isShouldersSideways && isHipsSideways && isCentered;
      const totalSideChecks = 3; // shoulders, hips, centering
      const alignmentScore = Math.max(0, (totalSideChecks - misalignedLimbs.length) / totalSideChecks);
      
      // Generate feedback for side pose
      if (isSidePoseAligned) {
        feedback = "Perfect side pose! Hold steady...";
      } else if (alignmentScore >= 0.6) {
        feedback = "Almost there! Turn more sideways";
      } else {
        if (misalignedLimbs.includes('shoulders_not_sideways') || misalignedLimbs.includes('hips_not_sideways')) {
          feedback = "Turn fully sideways - shoulders and hips should overlap";
        } else if (misalignedLimbs.includes('centering')) {
          feedback = "Move to center of frame";
        } else {
          feedback = "Position yourself in view and turn sideways";
        }
      }
      
      console.log('🎯 SIDE POSE RESULT:', {
        isAligned: isSidePoseAligned,
        alignmentScore: alignmentScore.toFixed(3),
        feedback
      });
      
      return {
        isAligned: isSidePoseAligned,
        misalignedLimbs,
        alignmentScore,
        feedback
      };
    }
    
    // FRONT POSE VALIDATION (existing logic)
    const alignmentThreshold = 0.2; // 20% tolerance (increased from 15%)
    const misalignedLimbs: string[] = [];
    let feedback = "";
    
    // Check if person is facing camera (nose should be visible)
    if (!nose || nose.score < 0.5) {
      misalignedLimbs.push('face');
      feedback = "Please face the camera";
    }
    
    // Analyze shoulder alignment (should be horizontal)
    if (leftShoulder && rightShoulder && leftShoulder.score > 0.5 && rightShoulder.score > 0.5) {
      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
      const shoulderHeight = Math.abs(leftShoulder.y - rightShoulder.y);
      const shoulderAngle = shoulderHeight / shoulderWidth;
      
      if (shoulderAngle > alignmentThreshold) {
        misalignedLimbs.push('shoulders');
        feedback = "Keep shoulders level";
      }
    }
    
    // Analyze arm position (should be outstretched horizontally)
    if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
      if (leftWrist.score > 0.3 && leftShoulder.score > 0.5) {
        const leftArmHeight = Math.abs(leftWrist.y - leftShoulder.y);
        const leftShoulderHeight = Math.abs(leftShoulder.y - (rightShoulder?.y || leftShoulder.y));
        
        if (leftArmHeight > leftShoulderHeight * 0.3) {
          misalignedLimbs.push('left_arm');
          feedback = "Raise left arm horizontally";
        }
      }
      
      if (rightWrist.score > 0.3 && rightShoulder.score > 0.5) {
        const rightArmHeight = Math.abs(rightWrist.y - rightShoulder.y);
        const rightShoulderHeight = Math.abs(rightShoulder.y - (leftShoulder?.y || rightShoulder.y));
        
        if (rightArmHeight > rightShoulderHeight * 0.3) {
          misalignedLimbs.push('right_arm');
          feedback = "Raise right arm horizontally";
        }
      }
    }
    
    // Check body centering
    if (leftHip && rightHip && leftHip.score > 0.5 && rightHip.score > 0.5) {
      const hipCenter = (leftHip.x + rightHip.x) / 2;
      const screenCenter = (videoRef.current?.videoWidth || 640) / 2;
      const centerOffset = Math.abs(hipCenter - screenCenter) / screenCenter;
      
      if (centerOffset > 0.2) {
        misalignedLimbs.push('centering');
        feedback = "Move to center of frame";
      }
    }
    
    // Calculate overall alignment score
    const totalCheckpoints = 5; // face, shoulders, left_arm, right_arm, centering
    const alignmentScore = Math.max(0, (totalCheckpoints - misalignedLimbs.length) / totalCheckpoints);
    
    // More forgiving thresholds - green light at 0.8 instead of perfect alignment
    const isWellAligned = alignmentScore >= 0.8; // 80% threshold instead of 100%
    const allowMinorMisalignment = misalignedLimbs.length <= 1; // Allow 1 minor issue
    
    if (isWellAligned && allowMinorMisalignment) {
      feedback = "Great pose! Hold steady...";
    } else if (alignmentScore >= 0.6) {
      feedback = "Almost there! " + (alignmentScore >= 0.7 ? "Hold still for a moment..." : "Adjust your position slightly");
    } else {
      feedback = misalignedLimbs.length > 0 ? 
        (misalignedLimbs.includes('face') ? "Please face the camera" : 
         misalignedLimbs.includes('shoulders') ? "Keep shoulders level" :
         misalignedLimbs.includes('left_arm') || misalignedLimbs.includes('right_arm') ? "Raise arms horizontally" :
         "Move to center of frame") : "Adjust your position";
    }
    
    return {
      isAligned: isWellAligned && allowMinorMisalignment,
      misalignedLimbs,
      alignmentScore,
      feedback
    };
  }, [currentStep, showSuccessScreen, hasImageReady]);

  const drawPoseOverlay = useCallback((pose: DetectedPose, alignment: AlignmentFeedback) => {
    // ✅ 1. CRITICAL GUARD: Stop drawing immediately during transitions
    if (showSuccessScreen || isScanningFadingOut) {
      console.log('⚪ Canvas cleared - blocking pose overlay during transition');
      
      // Clear canvas immediately when transition starts
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
      }
      return;
    }
    
    // STEP 4: DRAW DEBUG
    console.log("[DRAW] drawPoseOverlay called");
    
    if (!overlayCanvasRef.current || !videoRef.current) {
      console.log('[DRAW] ❌ Missing canvas or video ref');
      return;
    }
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('[DRAW] ❌ No canvas context');
      return;
    }
    
    // STEP 4: DRAW RED TEST BOX
    ctx.fillStyle = "red";
    ctx.fillRect(10, 10, 20, 20);
    console.log("[DRAW] Red test box drawn");
    
    const video = videoRef.current;
    
    // Set canvas buffer size to match video dimensions
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    
    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // REDRAW TEST BOX AFTER CLEAR
    ctx.fillStyle = "red";
    ctx.fillRect(10, 10, 20, 20);
    
    console.log(`[DRAW] Canvas setup: ${canvas.width}x${canvas.height}, video: ${video.videoWidth}x${video.videoHeight}`);
    
    if (!pose?.keypoints?.length) {
      console.log('[DRAW] ❌ No keypoints to draw, but red box should be visible');
      return;
    }
    
    console.log(`[DRAW] Drawing ${pose.keypoints.length} keypoints`);
    
    // Draw GREEN DOTS for pose keypoints - FORCE VISIBLE
    let drawnKeypoints = 0;
    pose.keypoints.forEach((keypoint, index) => {
      if (keypoint.score > 0.2) {
        const isAligned = !alignment.misalignedLimbs.some(limb => 
          keypoint.name?.includes(limb.replace('_', ' '))
        );
        
        // LARGE OUTER GLOW for visibility
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 15, 0, 2 * Math.PI);
        ctx.fillStyle = isAligned ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 107, 0, 0.5)';
        ctx.fill();
        
        // LARGE GREEN DOT - FORCE VISIBLE
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = isAligned ? '#00ff00' : '#ff6b00';
        ctx.fill();
        
        // WHITE BORDER for maximum contrast
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 8, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        drawnKeypoints++;
        console.log(`[DRAW] ✅ Drew keypoint ${index}: ${keypoint.name} at (${keypoint.x.toFixed(1)}, ${keypoint.y.toFixed(1)})`);
      }
    });
    
    console.log(`[DRAW] Successfully drew ${drawnKeypoints} GREEN DOTS`);
    
    // Draw WHITE SKELETON LINES - FORCE VISIBLE
    const connections = [
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist'],
      ['left_hip', 'right_hip'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
    ];
    
    let drawnConnections = 0;
    connections.forEach(([pointA, pointB]) => {
      const kpA = pose.keypoints.find(kp => kp.name === pointA);
      const kpB = pose.keypoints.find(kp => kp.name === pointB);
      
      if (kpA && kpB && kpA.score > 0.2 && kpB.score > 0.2) {
        // THICK WHITE SKELETON LINES
        ctx.beginPath();
        ctx.moveTo(kpA.x, kpA.y);
        ctx.lineTo(kpB.x, kpB.y);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.stroke();
        
        // COLORED INNER LINE for alignment feedback
        ctx.beginPath();
        ctx.moveTo(kpA.x, kpA.y);
        ctx.lineTo(kpB.x, kpB.y);
        ctx.strokeStyle = alignment.isAligned ? '#00ffff' : '#ff6b00';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        drawnConnections++;
      }
    });
    
    console.log(`[DRAW] Successfully drew ${drawnConnections} WHITE SKELETON LINES`);
    console.log('[DRAW] ✅ Pose overlay drawing complete');
  }, [showSuccessScreen, hasImageReady, isScanningFadingOut]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast({
        title: "Invalid Image",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    if (validation.warning) {
      toast({
        title: "Large Image",
        description: validation.warning,
      });
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
      setHasImageReady(true);
      
      toast({
        title: "Image Uploaded!",
        description: "Front body image ready. You can now continue to the side scan.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleContinue = () => {
    console.log('➡️ Continue clicked');
    alert('Continue clicked');
    console.log('🚀 handleContinue called:', { hasImageReady, savedScanUrl: !!savedScanUrl, currentStep });
    
    if (hasImageReady && savedScanUrl) {
      // Store current scan URL before clearing it
      const currentScanUrl = savedScanUrl;
      
      console.log(`✅ Starting transition from ${currentStep} step`);
      
      // Start cinematic transition
      setIsTransitioning(true);
      
      // Hide success screen immediately
      setShowSuccessScreen(false);
      
      setTimeout(() => {
        // Advance to next step
        if (currentStep === 'front') {
          console.log('📱 Advancing to side scan');
          setCurrentStep('side');
          toast({
            title: "📸 Great! Now turn sideways",
            description: "Position yourself sideways for the side view photo",
            duration: 4000,
          });
        } else if (currentStep === 'side') {
          console.log('📱 Advancing to back scan');
          setCurrentStep('back');
          toast({
            title: "📸 Awesome! Now turn around",
            description: "Turn around so we can capture your back view",
            duration: 4000,
          });
        } else {
          console.log('🎉 All scans completed - showing weight modal');
          // Final step completed - show weight modal
          setShowWeightModal(true);
          setIsTransitioning(false);
          return;
        }
        
        // Reset states for next step AFTER step change
        console.log('🔄 Resetting states for next step');
        setCapturedImage(null);
        setHasImageReady(false);
        setAlignmentConfirmed(false);
        setCountdownSeconds(0);
        setIsCountingDown(false);
        setSavedScanUrl(null); // Clear AFTER step change
        
        // End transition after state reset
        setTimeout(() => {
          setIsTransitioning(false);
          console.log(`✨ Transition to ${currentStep === 'front' ? 'side' : 'back'} complete`);
        }, 300);
      }, 800); // Slightly longer for cinematic effect
    } else {
      console.warn('❌ handleContinue: Invalid state', { hasImageReady, savedScanUrl: !!savedScanUrl });
    }
  };

  const handleCancel = () => {
    navigate('/exercise-hub');
  };

  const handleImageLoad = () => {
    console.log('Body outline image loaded successfully');
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    console.log('Failed to load body outline image');
    setImageError(true);
    setImageLoaded(false);
  };

  const toggleCamera = () => {
    setCameraMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Enhanced step instructions with visual themes
  const stepInstructions = {
    front: {
      title: '👤 Front Body Scan',
      subtitle: 'Stand upright with arms slightly out. Match your body to the glowing outline.',
      theme: 'from-blue-500 to-cyan-500',
      borderColor: 'border-blue-400',
      bgColor: 'bg-blue-500/90',
      icon: '👤',
      step: 1
    },
    side: {
      title: '🚶 Side Body Scan', 
      subtitle: 'Turn sideways with arms relaxed. Face right and align your body with the outline.',
      theme: 'from-green-500 to-emerald-500',
      borderColor: 'border-green-400',
      bgColor: 'bg-green-500/90',
      icon: '🚶',
      step: 2
    },
    back: {
      title: '🔄 Back Body Scan',
      subtitle: 'Turn around with arms relaxed. Match your body to the glowing outline for the back scan.',
      theme: 'from-purple-500 to-violet-500',
      borderColor: 'border-purple-400',
      bgColor: 'bg-purple-500/90',
      icon: '🔄',
      step: 3
    },
  };

  // Get current step configuration
  const currentStepConfig = stepInstructions[currentStep];

  return (
    <div className={`fixed inset-0 w-full h-full bg-black overflow-hidden portrait:block landscape:hidden transition-all duration-700 ${
      isTransitioning ? 'bg-gray-900' : 'bg-black'
    }`}>
      {/* Landscape orientation warning */}
      {showOrientationWarning && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-yellow-500/90 text-black p-6 rounded-2xl text-center max-w-sm">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-lg font-bold mb-2">Please Rotate Your Device</h3>
            <p className="text-sm">
              For the best body scanning experience, please hold your device in portrait mode.
            </p>
          </div>
        </div>
      )}

      {/* Main content - only show in portrait */}
      <div className="portrait:block landscape:hidden w-full h-full">
      {/* Camera video background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(console.log);
            }
          }}
          className="w-full h-full object-cover"
        />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      
      {/* STEP 5: CANVAS WITH LIME BORDER - Hidden when scan is successful */}
      {!showSuccessScreen && !isScanningFadingOut && (
        <canvas 
          ref={overlayCanvasRef}
           style={{
             border: '3px solid lime',
             position: 'absolute',
             zIndex: 10, // Lower than flash (z-30) and success (z-40)
             top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: 'block'
          }}
        />
      )}
      
      {/* Grid Overlay - Fixed behind camera */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-10">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.3))'
        }}></div>
      </div>

      {/* Enhanced Progress Indicator & Cinematic Header */}
      <div className={`absolute top-4 md:top-6 left-4 right-4 z-20 transition-all duration-700 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {/* Enhanced Progress Bar with Step Completion */}
        <div className={`bg-black/60 backdrop-blur-sm rounded-xl p-3 border mb-3 transition-all duration-500 ${currentStepConfig.borderColor}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-xs font-medium">Progress</span>
            <span className="text-white text-sm font-bold flex items-center gap-2">
              <span className="text-xl">{currentStepConfig.icon}</span>
              Step {currentStepConfig.step} of 3
            </span>
          </div>
          <div className="flex gap-1">
            {['front', 'side', 'back'].map((step, index) => (
              <div key={step} className="flex-1 bg-white/20 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-700 ${
                    completedSteps.has(step) 
                      ? 'bg-gradient-to-r from-green-400 to-green-500' 
                      : step === currentStep 
                      ? `bg-gradient-to-r ${currentStepConfig.theme}` 
                      : 'bg-transparent'
                  }`}
                  style={{ width: completedSteps.has(step) || step === currentStep ? '100%' : '0%' }}
                ></div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Cinematic Dynamic Header */}
        <div key={currentStep} className={`bg-black/60 backdrop-blur-sm rounded-2xl p-4 border transition-all duration-700 animate-fade-in ${currentStepConfig.borderColor}`}>
          <div className="text-center relative">
            {/* Step Icon with Animation */}
            <div className="text-4xl mb-3 animate-scale-in">{currentStepConfig.icon}</div>
            
            {/* Step Title with Gradient */}
            <h2 className={`text-white text-lg font-bold mb-2 bg-gradient-to-r ${currentStepConfig.theme} bg-clip-text text-transparent`}>
              {currentStepConfig.title}
            </h2>
            
            {/* Step Subtitle */}
            <p className="text-white/90 text-sm leading-relaxed">
              {currentStepConfig.subtitle}
            </p>
            
            {/* Dynamic Background Accent */}
            <div className={`absolute inset-0 bg-gradient-to-r ${currentStepConfig.theme} opacity-5 rounded-2xl -z-10`}></div>
          </div>
        </div>
      </div>

      
      {/* Enhanced Dynamic Body Silhouette with Fixed Spacing */}
      <div key={currentStep} className={`absolute inset-0 flex items-center justify-center pt-24 pb-40 z-15 transition-all duration-1000 ${isTransitioning ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
        <div className={`relative transition-all duration-700 ${
          isCapturing ? 'scale-105' : 'scale-100'
        } ${hasImageReady ? 'filter brightness-110 hue-rotate-60' : ''}`}>
          {/* Step-specific glow effect */}
          <div className={`absolute inset-0 bg-gradient-to-r ${currentStepConfig.theme} opacity-20 blur-3xl rounded-full scale-110 animate-pulse`}></div>
          
          <img 
            src={
              currentStep === 'front' 
                ? "/lovable-uploads/f79fe9f7-e1df-47ea-bdca-a4389f4528f5.png"
                : currentStep === 'side'
                ? sideViewSilhouette
                : "/lovable-uploads/f79fe9f7-e1df-47ea-bdca-a4389f4528f5.png"
            }
            alt={`${currentStep} body silhouette`}
            className={`w-[80vw] max-h-[55vh] h-auto object-contain animate-fade-in relative z-10 ${
              currentStep === 'front' ? 'opacity-90 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] drop-shadow-[0_0_16px_rgba(59,130,246,0.6)]' :
              currentStep === 'side' ? 'opacity-90 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)] drop-shadow-[0_0_16px_rgba(34,197,94,0.6)]' :
              'opacity-90 drop-shadow-[0_0_8px_rgba(147,51,234,0.8)] drop-shadow-[0_0_16px_rgba(147,51,234,0.6)]'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      </div>

      {/* ✅ 4. Enhanced Step Success Screen with Smooth Animation */}
      {showSuccessScreen && savedScanUrl && ((() => {
        console.log('🎯 Rendering success screen:', { showSuccessScreen, savedScanUrl: !!savedScanUrl, currentStep });
        return true;
      })()) && (
        <div key={currentStep} className="absolute inset-0 bg-gradient-to-br from-black/95 via-black/90 to-black/95 flex flex-col items-center justify-center z-40 p-8">
          {/* ✅ 4. Stable container with proper fade and bounce timing */}
          <div className="opacity-0 animate-[fadeIn_300ms_ease-out_forwards]">
            <div className="opacity-0 animate-[bounceIn_400ms_ease-out_100ms_forwards]">
            <div className={`bg-gradient-to-br ${currentStepConfig.theme} bg-opacity-10 backdrop-blur-xl rounded-[2rem] p-10 text-center max-w-md border-2 ${currentStepConfig.borderColor} shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] hover:shadow-[0_35px_60px_-12px_rgba(0,0,0,0.7)] transition-all duration-500`}>
            {/* Success Icon with Enhanced Animation */}
            <div className="text-7xl mb-8 animate-[bounce_1s_ease-in-out_3]">🎉</div>
            
            {/* Enhanced Success Title */}
            <h3 className="text-white text-3xl font-bold mb-3 tracking-wide">
              Scan Complete!
            </h3>
            <p className="text-white/70 text-lg mb-8 leading-relaxed">
              {currentStep === 'front' ? 'Front view captured perfectly' : 
               currentStep === 'side' ? 'Side profile saved successfully' : 
               'Back view scan completed'}
            </p>
            
            {/* Enhanced Thumbnail with Premium Feel */}
            <div className={`mb-8 rounded-3xl overflow-hidden border-3 ${currentStepConfig.borderColor} shadow-2xl relative group`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent z-10"></div>
              <img 
                src={savedScanUrl}
                alt={`${currentStep} body scan`}
                className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            
            {/* Enhanced Action Buttons */}
            <div className="space-y-4">
              <Button
                onClick={handleContinue}
                className={`w-full bg-gradient-to-r ${currentStepConfig.theme} hover:scale-[1.02] text-white font-bold py-5 text-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-white/20`}
              >
                {currentStep === 'front' ? '🚶 Continue to Side Scan' : 
                 currentStep === 'side' ? '🔄 Continue to Back Scan' : 
                 '🎉 Complete All Scans'}
              </Button>
              <Button
                onClick={handleRetake}
                variant="outline"
                className="w-full bg-white/5 border-2 border-white/30 text-white hover:bg-white/15 hover:border-white/50 transition-all duration-300 py-4 text-lg rounded-2xl"
              >
                🔁 Retake Scan
              </Button>
            </div>

            {/* Nudge Text with Fade-in Animation */}
            {showNudgeText && (
              <div className="mt-6 pt-6 border-t border-white/20 animate-fade-in">
                <p className="text-white/60 text-sm flex items-center justify-center gap-2">
                  ✔️ Great job! Ready for the next scan?
                  <ArrowRight className="w-4 h-4 animate-pulse" />
                </p>
              </div>
            )}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Step Success Transition Screen */}
      {showStepSuccess && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-40 animate-fade-in">
          <div className={`text-center animate-scale-in`}>
            <div className={`text-8xl mb-6 animate-bounce`}>{currentStepConfig.icon}</div>
            <h2 className={`text-4xl font-bold mb-4 bg-gradient-to-r ${currentStepConfig.theme} bg-clip-text text-transparent`}>
              Step {currentStepConfig.step} Complete!
            </h2>
            <div className="text-white/60 text-lg">
              {currentStep === 'front' ? 'Preparing side view...' : 
               currentStep === 'side' ? 'Preparing back view...' : 
               'Preparing completion...'}
            </div>
          </div>
        </div>
      )}

      {/* Camera Toggle Button - Above Cancel Button */}
      <div className="fixed bottom-52 right-6 z-30">
        <Button
          onClick={toggleCamera}
          className="w-16 h-16 rounded-full bg-black/80 backdrop-blur-md border-2 border-cyan-400/60 text-white hover:bg-black/90 hover:border-cyan-300/80 transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
          size="sm"
        >
          <div className="text-xl">🔄</div>
        </Button>
      </div>

      {/* Fixed Bottom Controls - Matching Health Scanner */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent z-20">
        <div className="flex flex-col space-y-4">
          {/* Cancel Button */}
          <Button
            onClick={handleCancel}
            className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl border-2 border-red-500 transition-all duration-300"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </Button>

          {/* Upload Button */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="bg-blue-600/20 border-blue-400 text-blue-300 hover:bg-blue-600/30 hover:text-white transition-all duration-300"
          >
            <Upload className="w-5 h-5 mr-2" />
            📷 Upload Image
          </Button>

          {/* Enhanced Main Action Button with Step Theming */}
          <Button
            onClick={hasImageReady ? handleContinue : captureImage}
            disabled={
              isCapturing || 
              isSaving ||
              (isPoseDetectionEnabled && (!alignmentFeedback || !alignmentFeedback.isAligned)) ||
              isCountingDown ||
              showSuccessScreen ||
              isTransitioning
            }
            className={`relative bg-gradient-to-r transition-all duration-300 disabled:opacity-50 text-white font-bold py-4 text-lg border-2 ${
              // Enhanced button theming based on step and alignment
              (!isPoseDetectionEnabled) 
                ? `${currentStepConfig.theme} hover:scale-105 ${currentStepConfig.borderColor} shadow-lg`
                : (alignmentFeedback === null)
                ? 'from-gray-500 to-gray-600 border-gray-400 cursor-not-allowed'
                : (alignmentFeedback.isAligned === false)
                ? 'from-gray-500 to-gray-600 border-gray-400 cursor-not-allowed'
                : `${currentStepConfig.theme} hover:scale-105 ${currentStepConfig.borderColor} shadow-[0_0_20px_rgba(59,130,246,0.4)]`
            }`}
          >
            <div className="flex items-center justify-center">
              {showSuccessScreen ? (
                <>
                  <ArrowRight className="w-6 h-6 mr-3" />
                  {currentStepConfig.icon} Continue to {currentStep === 'front' ? 'Side' : currentStep === 'side' ? 'Back' : 'Complete'} Scan
                </>
              ) : hasImageReady ? (
                <>
                  <div className={`w-6 h-6 mr-3 ${isSaving ? 'animate-spin' : ''}`}>
                    {isSaving ? '💾' : currentStepConfig.icon}
                  </div>
                  {isSaving ? 'Saving Scan...' : 'Scan Saved!'}
                </>
              ) : (
                <>
                  <div className={`text-xl mr-3 ${isCapturing || isCountingDown ? 'animate-spin' : 'animate-pulse'}`}>
                    {isCapturing || isCountingDown ? '📸' : currentStepConfig.icon}
                  </div>
                  {isCountingDown ? `🔍 AUTO-CAPTURING IN ${countdownSeconds}...` : 
                   isCapturing ? '🔍 SCANNING...' : 
                   `📸 Capture ${currentStepConfig.title.split(' ')[1]} View`}
                  {/* Enhanced pose alignment indicator */}
                  {isPoseDetectionEnabled && alignmentFeedback && (
                    <span className="ml-2 text-lg">
                      {alignmentFeedback.isAligned ? '✅' : '⚠️'}
                    </span>
                  )}
                </>
              )}
            </div>
            {!hasImageReady && !isCapturing && !isTransitioning && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                           animate-[shimmer_2s_ease-in-out_infinite] rounded-lg"></div>
            )}
          </Button>
        </div>
      </div>

      {/* ✅ 3. Alignment feedback overlay - Hidden during transitions */}
      {alignmentFeedback && !alignmentFeedback.isAligned && !hasImageReady && !showSuccessScreen && !isScanningFadingOut && (
        <div className="absolute top-1/2 left-4 right-4 z-25 transform -translate-y-1/2">
          <div className={`backdrop-blur-sm rounded-2xl p-4 border transition-all duration-500 ease-in-out ${
            alignmentFeedback.alignmentScore >= 0.7 
              ? 'bg-yellow-500/90 border-yellow-400' 
              : alignmentFeedback.alignmentScore >= 0.6
              ? 'bg-orange-500/90 border-orange-400' 
              : 'bg-red-500/90 border-red-400'
          }`}>
            <h3 className="text-white font-bold mb-2 flex items-center">
              {alignmentFeedback.alignmentScore >= 0.7 ? '🟡' : alignmentFeedback.alignmentScore >= 0.6 ? '⚠️' : '❌'} 
              {alignmentFeedback.alignmentScore >= 0.7 ? ' Almost There!' : ' Pose Alignment'}
            </h3>
            <p className="text-white text-sm mb-2">
              Score: {Math.round(alignmentFeedback.alignmentScore * 100)}%
            </p>
            <p className="text-white text-sm font-medium">
              {currentStep === 'side' && !alignmentFeedback.isAligned 
                ? "🟡 Turn fully sideways so your shoulders and hips align"
                : alignmentFeedback.feedback}
            </p>
          </div>
        </div>
      )}

      {/* ✅ 3. Perfect pose indicator - Hidden during transitions */}
      {alignmentFeedback?.isAligned && !hasImageReady && !showSuccessScreen && !isScanningFadingOut && (
        <div className="absolute top-1/2 left-4 right-4 z-25 transform -translate-y-1/2">
          <div className="bg-green-500/90 backdrop-blur-sm rounded-2xl p-4 border border-green-400 transition-all duration-500 ease-in-out transform scale-105">
            <div className="text-center">
              <div className="text-2xl mb-2 animate-pulse">{currentStep === 'side' ? '🟢' : '✅'}</div>
              <p className="text-white font-bold text-lg">
                {currentStep === 'side' ? 'Perfect side pose!' : 'Great Pose!'}
              </p>
              <p className="text-white text-sm">
                {currentStep === 'side' ? 'Hold steady...' : 'Hold steady for auto-capture...'}
              </p>
              {alignmentFrameCount > 0 && (
                <div className="mt-2">
                  <div className="bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(100, (alignmentFrameCount / 5) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Auto-capture countdown with progress ring */}
      {isCountingDown && countdownSeconds > 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="relative bg-green-500/95 backdrop-blur-md rounded-full w-32 h-32 flex items-center justify-center border-4 border-white shadow-2xl animate-scale-in">
            {/* Progress ring background */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-white/30"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                className="text-white transition-all duration-1000 ease-out"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${((4 - countdownSeconds) / 3) * 100}, 100`}
                strokeLinecap="round"
              />
            </svg>
            
            {/* Countdown number */}
            <div className="relative z-10 text-center">
              <span className="text-white text-4xl font-bold animate-pulse drop-shadow-lg">
                {countdownSeconds}
              </span>
              <div className="text-white text-xs mt-1 opacity-80">
                {countdownSeconds === 3 ? 'Get Ready' : 
                 countdownSeconds === 2 ? 'Almost...' : 
                 countdownSeconds === 1 ? 'Capture!' : ''}
              </div>
            </div>
            
            {/* Pulsing outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-green-300/50 animate-ping"></div>
          </div>
        </div>
      )}

      {/* Scanning overlay during countdown */}
      {(isCountingDown && countdownSeconds > 0) && (
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm z-25 flex items-center justify-center transition-opacity duration-300 ${
          isScanningFadingOut ? 'opacity-0' : 'opacity-100 animate-fade-in'
        }`}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-center space-x-3">
              {/* Spinning loader */}
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              
              {/* Scanning text */}
              <div className="text-white text-lg font-semibold">
                📸 Scanning… Hold steady!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 1. Camera shutter flash effect with smooth fade */}
      {showShutterFlash && (
        <div className={`absolute inset-0 bg-white z-30 transition-opacity duration-150 ${
          showShutterFlash ? 'opacity-100' : 'opacity-0'
        }`}>
        </div>
      )}

      {/* Pose detection status indicator */}
      {isPoseDetectionEnabled && (
        <div className="absolute top-24 right-6 z-25">
          <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${
            poseDetectionReady ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
          }`}></div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      </div>
      
      {/* Weight Input Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-2 text-center">🎉 Body Scan Complete!</h3>
            <p className="text-gray-600 mb-4 text-center">
              We've saved your front, side, and back body scans. Our AI will now analyze your posture and muscle symmetry to help you improve performance and reduce injury risk.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Current weight (lbs or kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter your weight"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              onClick={completeFullBodyScan}
              disabled={isCompletingScan || !weight.trim()}
              className="w-full"
            >
              {isCompletingScan ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </div>
      )}

      {/* Scan Tips Modal */}
      <ScanTipsModal 
        isOpen={tipsModal.isOpen} 
        onClose={tipsModal.onClose} 
      />

      {/* Debug UI Block */}
      <div className="text-xs text-white bg-black p-2 rounded-lg mt-4 fixed bottom-4 left-4 right-4 z-50">
        <p>Step: {currentStep}</p>
        <p>showSuccessScreen: {showSuccessScreen.toString()}</p>
        <p>savedScanUrl: {savedScanUrl}</p>
        <p>hasImageReady: {hasImageReady.toString()}</p>
        <p>isTransitioning: {isTransitioning.toString()}</p>
        <p>errorSavingScan: {errorSavingScan}</p>
        <p>isSaving: {isSaving.toString()}</p>
      </div>
    </div>
  );
}
