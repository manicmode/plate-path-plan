
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
import sideBodySilhouette from '@/assets/sidebodysilhouetteV2.png';
import { BodyScanLoadingScreen } from '@/components/BodyScanLoadingScreen';

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
  const [savedSteps, setSavedSteps] = useState<Set<string>>(new Set());
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weight, setWeight] = useState('');
  const [isCompletingScan, setIsCompletingScan] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [isCompletionInProgress, setIsCompletionInProgress] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showStepSuccess, setShowStepSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const poseDetectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scanCompleteRef = useRef<boolean>(false);
  
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
  // Camera always uses rear-facing mode - camera toggle removed
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
  const [showFinalLoading, setShowFinalLoading] = useState(false);

  // Reset navigation state on mount
  useEffect(() => {
    console.log("🔄 Resetting navigation state on mount");
    scanCompleteRef.current = false;
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  }, []);

  // Reset complete scan state on mount
  useEffect(() => {
    console.log("🔄 Resetting scan state on mount");
    
    // Reset ref states
    scanCompleteRef.current = false;
    
    // Clear any existing timers
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Reset core scan states
    setCurrentStep('front');
    setCapturedImages({});
    setCompletedSteps(new Set());
    setCapturedImage(null);
    setHasImageReady(false);
    setPoseDetected(null);
    setAlignmentConfirmed(false);
    setIsCountingDown(false);
    setCountdownSeconds(0);
    setAlignmentFrameCount(0);
    
    // Reset completion states
    setIsCompletingScan(false);
    setScanCompleted(false);
    setIsCompletionInProgress(false);
    setIsTransitioning(false);
    setShowStepSuccess(false);
    setShowSuccessScreen(false);
    setShowFinalLoading(false);
    
    // Reset scan saving states
    setIsSaving(false);
    setSavedScanUrl(null);
    setErrorSavingScan(null);
    
    // Reset image states
    setImageLoaded(false);
    setImageError(false);
  }, []);

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
            facingMode: 'environment', // Always use rear camera
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
      // Clean up animation frame on unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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

  useEffect(() => {
    if (
      hasImageReady &&
      capturedImage &&
      !savedSteps.has(currentStep) &&
      !scanCompleted &&
      !isCompletionInProgress
    ) {
      console.log("🟢 Pose ready, saving scan for step:", currentStep);
      setSavedSteps((prev) => new Set([...prev, currentStep]));
      saveBodyScanToSupabase(capturedImage);
    }
  }, [
    hasImageReady,
    capturedImage,
    currentStep,
    savedSteps,
    scanCompleted,
    isCompletionInProgress
  ]);

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

  // Reset canvases and pose states on step change
  useEffect(() => {
    // Clear overlay canvas
    if (overlayCanvasRef.current) {
      const overlayCtx = overlayCanvasRef.current.getContext('2d');
      if (overlayCtx) {
        overlayCtx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }
    }

    // Clear main canvas
    if (canvasRef.current) {
      const mainCtx = canvasRef.current.getContext('2d');
      if (mainCtx) {
        mainCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    // Reset pose detection states
    setPoseDetected(null);
    setAlignmentFeedback(null);
    setAlignmentFrameCount(0);
    setAlignmentConfirmed(false);

    // Reattach video stream to refresh metadata and sizing
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      console.log(`[STEP RESET] Video stream reattached for step: ${currentStep}`);
    }
  }, [currentStep, stream]);

  // ✅ ORIENTATION VALIDATION FUNCTION
  const validateOrientationForStep = useCallback((pose: DetectedPose, step: 'front' | 'side' | 'back'): { isCorrectOrientation: boolean; feedback: string } => {
    const keypoints = pose.keypoints;
    
    // Find key landmarks
    const nose = keypoints.find(kp => kp.name === 'nose');
    const leftEye = keypoints.find(kp => kp.name === 'left_eye');
    const rightEye = keypoints.find(kp => kp.name === 'right_eye');
    const leftEar = keypoints.find(kp => kp.name === 'left_ear');
    const rightEar = keypoints.find(kp => kp.name === 'right_ear');
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
    const leftHip = keypoints.find(kp => kp.name === 'left_hip');
    const rightHip = keypoints.find(kp => kp.name === 'right_hip');
    
    console.log(`🎯 [ORIENTATION] Validating ${step} orientation...`);
    
    if (step === 'front') {
      console.log('🎯 [FRONT] Checking front orientation rules...');
      
      // 🔹 Front: Face keypoints (nose, eyes, ears) must be visible
      const faceVisible = nose && nose.score > 0.5;
      const eyesVisible = (leftEye && leftEye.score > 0.4) || (rightEye && rightEye.score > 0.4);
      console.log(`🎯 [FRONT] Face visible: ${faceVisible}, eyes visible: ${eyesVisible}`);
      
      if (!faceVisible || !eyesVisible) {
        return {
          isCorrectOrientation: false,
          feedback: "Turn to face the camera directly for front view"
        };
      }
      
      // 🔹 Front: Both shoulders must be visible and roughly horizontally aligned
      const bothShouldersVisible = leftShoulder && rightShoulder && 
                                   leftShoulder.score > 0.5 && rightShoulder.score > 0.5;
      console.log(`🎯 [FRONT] Both shoulders visible: ${bothShouldersVisible}`);
      
      if (!bothShouldersVisible) {
        return {
          isCorrectOrientation: false,
          feedback: "Both shoulders must be visible for front view"
        };
      }
      
      // 🔹 Front: Hips should also be visible
      const hipsVisible = leftHip && rightHip && leftHip.score > 0.4 && rightHip.score > 0.4;
      console.log(`🎯 [FRONT] Hips visible: ${hipsVisible}`);
      
      if (!hipsVisible) {
        return {
          isCorrectOrientation: false,
          feedback: "Step back so your full body is visible for front view"
        };
      }
      
      console.log('✅ [FRONT] Front orientation validation passed');
      return {
        isCorrectOrientation: true,
        feedback: "Good front orientation"
      };
      
    } else if (step === 'side') {
      console.log('🎯 [SIDE] Checking side orientation rules...');

      const leftShoulderVisible = leftShoulder && leftShoulder.score > 0.4;
      const rightShoulderVisible = rightShoulder && rightShoulder.score > 0.4;
      const leftHipVisible = leftHip && leftHip.score > 0.4;
      const rightHipVisible = rightHip && rightHip.score > 0.4;

      const visibleBodyParts = [
        leftShoulderVisible,
        rightShoulderVisible,
        leftHipVisible,
        rightHipVisible
      ].filter(Boolean).length;

      if (visibleBodyParts < 2) {
        return {
          isCorrectOrientation: false,
          feedback: "Step into full view for side scan"
        };
      }

      let shoulderAsymmetry = 0;
      let hipAsymmetry = 0;

      if (leftShoulder && rightShoulder) {
        shoulderAsymmetry = Math.abs(leftShoulder.score - rightShoulder.score);
      }
      if (leftHip && rightHip) {
        hipAsymmetry = Math.abs(leftHip.score - rightHip.score);
      }

      const noseScore = nose?.score || 0;
      const faceNotFullyVisible = noseScore < 0.7;

      const hasAsymmetry = shoulderAsymmetry > 0.3 || hipAsymmetry > 0.3;
      const hasPartialOcclusion = (leftShoulderVisible && !rightShoulderVisible) || 
                                  (!leftShoulderVisible && rightShoulderVisible) ||
                                  (leftHipVisible && !rightHipVisible) ||
                                  (!leftHipVisible && rightHipVisible);

      const validSideOrientation = hasAsymmetry || hasPartialOcclusion || faceNotFullyVisible;

      if (!validSideOrientation) {
        if (shoulderAsymmetry < 0.2 && hipAsymmetry < 0.2 && noseScore > 0.7) {
          return {
            isCorrectOrientation: false,
            feedback: "Turn sideways - you're still facing forward"
          };
        }

        return {
          isCorrectOrientation: false,
          feedback: "Position yourself sideways to the camera"
        };
      }

      return {
        isCorrectOrientation: true,
        feedback: "Good side orientation"
      };
      
    } else if (step === 'back') {
      console.log('🎯 [BACK] Checking back orientation rules...');
      
      // 🔹 Back: Face keypoints (nose, eyes) should have low or no confidence
      const noseVisible = nose && nose.score > 0.4;
      const eyesVisible = (leftEye && leftEye.score > 0.4) || (rightEye && rightEye.score > 0.4);
      
      console.log(`🎯 [BACK] Face should NOT be visible - nose: ${noseVisible}, eyes: ${eyesVisible}`);
      
      if (noseVisible || eyesVisible) {
        return {
          isCorrectOrientation: false,
          feedback: "Turn around completely to show your back"
        };
      }
      
      // 🔹 Back: Both shoulders and hips visible from behind
      const bothShouldersVisible = leftShoulder && rightShoulder && 
                                   leftShoulder.score > 0.4 && rightShoulder.score > 0.4;
      const bothHipsVisible = leftHip && rightHip && 
                             leftHip.score > 0.4 && rightHip.score > 0.4;
      
      console.log(`🎯 [BACK] Shoulders from behind: ${bothShouldersVisible}, hips from behind: ${bothHipsVisible}`);
      
      if (!bothShouldersVisible) {
        return {
          isCorrectOrientation: false,
          feedback: "Both shoulders should be visible from behind"
        };
      }
      
      if (!bothHipsVisible) {
        return {
          isCorrectOrientation: false,
          feedback: "Step back so your full body is visible from behind"
        };
      }
      
      // 🔹 Back: Shoulders should be roughly symmetrical
      if (leftShoulder && rightShoulder) {
        const shoulderSymmetry = Math.abs(leftShoulder.score - rightShoulder.score);
        console.log(`🎯 [BACK] Shoulder symmetry difference: ${shoulderSymmetry.toFixed(3)}`);
        
        if (shoulderSymmetry > 0.3) {
          return {
            isCorrectOrientation: false,
            feedback: "Stand straight with shoulders evenly positioned"
          };
        }
      }
      
      console.log('✅ [BACK] Back orientation validation passed');
      return {
        isCorrectOrientation: true,
        feedback: "Good back orientation"
      };
    }
    
    return {
      isCorrectOrientation: false,
      feedback: "Unknown scan step"
    };
  }, []);

  // Enhanced pose analysis with comprehensive validation and debug logging
  const analyzePoseAlignment = useCallback((pose: DetectedPose): AlignmentFeedback => {
    console.log('🔍 [POSE ANALYSIS] Starting pose alignment analysis...');
    console.log(`📊 [POSE ANALYSIS] Current step: ${currentStep}`);
    console.log(`📊 [POSE ANALYSIS] Detected pose keypoints count: ${pose.keypoints.length}`);
    console.log(`📊 [POSE ANALYSIS] Pose overall score: ${pose.score?.toFixed(3) || 'N/A'}`);
    
    // Log keypoint scores for debugging
    const keypointScores = pose.keypoints.map(kp => `${kp.name}: ${kp.score.toFixed(3)}`);
    console.log(`📊 [POSE ANALYSIS] Keypoint scores: ${keypointScores.join(', ')}`);
    
    // STEP 1: Enhanced human presence validation with tiered levels
    const presenceCheck = validateHumanPresence(pose);
    console.log(`🔍 [POSE ANALYSIS] Human presence check: level=${presenceCheck.level}, validCount=${presenceCheck.validCount}, avgConfidence=${presenceCheck.avgConfidence.toFixed(3)}`);
    
    // Immediate return for no human detected
    if (presenceCheck.level === 'none') {
      console.log('❌ [POSE ANALYSIS] No human detected');
      return {
        isAligned: false,
        misalignedLimbs: ['no_human'],
        alignmentScore: 0,
        feedback: "No person detected. Step into view to begin."
      };
    }
    
    // Partial human detection - give encouraging feedback
    if (presenceCheck.level === 'partial') {
      console.log('⚠️ [POSE ANALYSIS] Partial human detection');
      return {
        isAligned: false,
        misalignedLimbs: ['partial_detection'],
        alignmentScore: Math.min(0.4, presenceCheck.avgConfidence), // Cap at 40% for partial detection
        feedback: `Getting there! Move closer or adjust position. (${presenceCheck.validCount}/9 landmarks detected)`
      };
    }
    
    console.log('✅ [POSE ANALYSIS] Full human detected, proceeding with orientation validation');
    
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
    const leftEye = keypoints.find(kp => kp.name === 'left_eye');
    const rightEye = keypoints.find(kp => kp.name === 'right_eye');
    const leftEar = keypoints.find(kp => kp.name === 'left_ear');
    const rightEar = keypoints.find(kp => kp.name === 'right_ear');
    
    console.log(`🔍 [POSE ANALYSIS] Key landmarks - nose: ${nose?.score.toFixed(3) || 'N/A'}, eyes: L=${leftEye?.score.toFixed(3) || 'N/A'} R=${rightEye?.score.toFixed(3) || 'N/A'}, shoulders: L=${leftShoulder?.score.toFixed(3) || 'N/A'} R=${rightShoulder?.score.toFixed(3) || 'N/A'}, hips: L=${leftHip?.score.toFixed(3) || 'N/A'} R=${rightHip?.score.toFixed(3) || 'N/A'}`);
    
    // ✅ STEP 2: ORIENTATION VALIDATION - Step-specific rules that override generic alignment
    const orientationValidation = validateOrientationForStep(pose, currentStep);
    console.log(`🎯 [ORIENTATION] Validation result for ${currentStep}: ${orientationValidation.isCorrectOrientation ? 'PASS' : 'FAIL'}`);
    console.log(`🎯 [ORIENTATION] Feedback: ${orientationValidation.feedback}`);
    
    // If orientation is wrong, return immediately - don't proceed to generic alignment
    if (!orientationValidation.isCorrectOrientation) {
      return {
        isAligned: false,
        misalignedLimbs: ['wrong_orientation'],
        alignmentScore: 0,
        feedback: orientationValidation.feedback
      };
    }
    
    console.log('✅ [ORIENTATION] Correct orientation detected, proceeding with generic alignment analysis');
    
    const alignmentThreshold = 0.2; // 20% tolerance (increased from 15%)
    const misalignedLimbs: string[] = [];
    let feedback = "";
    
    // STEP 3: GENERIC ALIGNMENT CHECKS (only after orientation is validated)
    
    // Check if person is facing camera (nose should be visible) - only for front view
    if (currentStep === 'front' && (!nose || nose.score < 0.5)) {
      misalignedLimbs.push('face');
      feedback = "Please face the camera";
      console.log('❌ [POSE ANALYSIS] Face not visible or score too low');
    }
    
    // Analyze shoulder alignment (should be horizontal)
    if (leftShoulder && rightShoulder && leftShoulder.score > 0.5 && rightShoulder.score > 0.5) {
      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
      const shoulderHeight = Math.abs(leftShoulder.y - rightShoulder.y);
      const shoulderAngle = shoulderHeight / shoulderWidth;
      
      console.log(`🔍 [POSE ANALYSIS] Shoulder alignment - width: ${shoulderWidth.toFixed(1)}px, height: ${shoulderHeight.toFixed(1)}px, angle: ${shoulderAngle.toFixed(3)}`);
      
      if (shoulderAngle > alignmentThreshold) {
        misalignedLimbs.push('shoulders');
        feedback = "Keep shoulders level";
        console.log('❌ [POSE ANALYSIS] Shoulders not level');
      }
    }
    
    // Analyze arm position (should be outstretched horizontally) - mainly for front view
    if (currentStep === 'front' && leftWrist && rightWrist && leftShoulder && rightShoulder) {
      if (leftWrist.score > 0.3 && leftShoulder.score > 0.5) {
        const leftArmHeight = Math.abs(leftWrist.y - leftShoulder.y);
        const leftShoulderHeight = Math.abs(leftShoulder.y - (rightShoulder?.y || leftShoulder.y));
        
        console.log(`🔍 [POSE ANALYSIS] Left arm - height diff: ${leftArmHeight.toFixed(1)}px, threshold: ${(leftShoulderHeight * 0.3).toFixed(1)}px`);
        
        if (leftArmHeight > leftShoulderHeight * 0.3) {
          misalignedLimbs.push('left_arm');
          feedback = "Raise left arm horizontally";
          console.log('❌ [POSE ANALYSIS] Left arm not horizontal');
        }
      }
      
      if (rightWrist.score > 0.3 && rightShoulder.score > 0.5) {
        const rightArmHeight = Math.abs(rightWrist.y - rightShoulder.y);
        const rightShoulderHeight = Math.abs(rightShoulder.y - (leftShoulder?.y || rightShoulder.y));
        
        console.log(`🔍 [POSE ANALYSIS] Right arm - height diff: ${rightArmHeight.toFixed(1)}px, threshold: ${(rightShoulderHeight * 0.3).toFixed(1)}px`);
        
        if (rightArmHeight > rightShoulderHeight * 0.3) {
          misalignedLimbs.push('right_arm');
          feedback = "Raise right arm horizontally";
          console.log('❌ [POSE ANALYSIS] Right arm not horizontal');
        }
      }
    }
    
    // Check body centering
    if (leftHip && rightHip && leftHip.score > 0.5 && rightHip.score > 0.5) {
      const hipCenter = (leftHip.x + rightHip.x) / 2;
      const screenCenter = (videoRef.current?.videoWidth || 640) / 2;
      const centerOffset = Math.abs(hipCenter - screenCenter) / screenCenter;
      
      console.log(`🔍 [POSE ANALYSIS] Body centering - hip center: ${hipCenter.toFixed(1)}px, screen center: ${screenCenter.toFixed(1)}px, offset: ${(centerOffset * 100).toFixed(1)}%`);
      
      if (centerOffset > 0.2) {
        misalignedLimbs.push('centering');
        feedback = "Move to center of frame";
        console.log('❌ [POSE ANALYSIS] Body not centered');
      }
    }
    
    // Calculate overall alignment score
    const totalCheckpoints = currentStep === 'front' ? 5 : 3; // Different checkpoint counts per step
    let alignmentScore = Math.max(0, (totalCheckpoints - misalignedLimbs.length) / totalCheckpoints);
    
    console.log(`📊 [POSE ANALYSIS] Initial alignment score: ${(alignmentScore * 100).toFixed(1)}% (${totalCheckpoints - misalignedLimbs.length}/${totalCheckpoints} checkpoints passed)`);
    console.log(`📊 [POSE ANALYSIS] Misaligned limbs: [${misalignedLimbs.join(', ')}]`);
    
    // ✅ Fallback logic: If alignmentScore = 0% but keypoints are valid and body is visible
    if (alignmentScore === 0 && pose.keypoints.length >= 10) {
      const visibleKeypoints = pose.keypoints.filter(kp => kp.score > 0.4);

      if (visibleKeypoints.length >= 6) {
        if (currentStep === 'side') {
          const hasBodyParts = visibleKeypoints.some(kp =>
            kp.name.includes('shoulder') || kp.name.includes('hip')
          );

          if (hasBodyParts) {
            alignmentScore = 0.75;
            console.log('✅ [FALLBACK] Side view fallback applied');
          }
        } else {
          const leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
          const rightShoulder = pose.keypoints.find(kp => kp.name === 'right_shoulder');

          if (leftShoulder && rightShoulder && leftShoulder.score > 0.4 && rightShoulder.score > 0.4) {
            alignmentScore = 0.65;
            console.log('✅ [FALLBACK] Front/back fallback applied');
          }
        }
      }
    }
    
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
    
    const finalResult = {
      isAligned: isWellAligned && allowMinorMisalignment,
      misalignedLimbs,
      alignmentScore,
      feedback
    };
    
    console.log(`📊 [POSE ANALYSIS] Final result - isAligned: ${finalResult.isAligned}, alignmentScore: ${(finalResult.alignmentScore * 100).toFixed(1)}%, feedback: "${finalResult.feedback}"`);
    
    return finalResult;
  }, [currentStep]);

  // Enhanced pose detection loop with improved alignment analysis
  useEffect(() => {
    const detectPoseRealTime = async () => {
      // ✅ STOP POSE DETECTION WHEN WEIGHT MODAL IS OPEN
      if (showWeightModal) {
        animationFrameRef.current = requestAnimationFrame(detectPoseRealTime);
        return;
      }
      
      // STEP 1: VIDEO DEBUG CHECK
      console.log("[VIDEO]", videoRef.current);
      if (videoRef.current?.readyState !== 4) {
        console.log("[VIDEO] Not ready", videoRef.current?.readyState);
        animationFrameRef.current = requestAnimationFrame(detectPoseRealTime);
        return;
      }
      
      // STEP 8: VIDEO STREAM DIMENSIONS
      console.log("[VIDEO STREAM] Width:", videoRef.current.videoWidth, "Height:", videoRef.current.videoHeight);
      
      if (!videoRef.current || !poseDetectorRef.current || !isPoseDetectionEnabled || !poseDetectionReady) {
        animationFrameRef.current = requestAnimationFrame(detectPoseRealTime);
        return;
      }

      const video = videoRef.current;
      const overlayCanvas = overlayCanvasRef.current;

      // STEP 2: ANIMATION LOOP DEBUG
      console.log("[LOOP] Running frame", Date.now());

      // ✅ ORIENTATION DEBUG: Log current scan step
      console.log(`[ORIENTATION] Current scan step: ${currentStep}, completed steps: [${Array.from(completedSteps).join(', ')}]`);

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
          console.log("[KEYPOINTS] Visible keypoints (score > 0.5):", keypoints.filter(kp => kp.score > 0.5).length);
          
          // ✅ LOG ALL VISIBLE KEYPOINTS BY NAME AND CONFIDENCE
          console.log("=== ALL VISIBLE KEYPOINTS ===");
          keypoints.forEach((kp, i) => {
            if (kp.score > 0.3) { // Lower threshold to see more keypoints
              console.log(`[KEYPOINT] ${kp.name}: confidence=${kp.score.toFixed(3)}, position=(${kp.x.toFixed(1)}, ${kp.y.toFixed(1)})`);
            }
          });
          
          // ✅ LOG FACIAL KEYPOINTS SPECIFICALLY
          const facialKeypoints = ['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear'];
          console.log("=== FACIAL KEYPOINTS ===");
          facialKeypoints.forEach(name => {
            const kp = keypoints.find(k => k.name === name);
            if (kp) {
              console.log(`[FACIAL] ${name}: detected=${kp.score > 0.3 ? 'YES' : 'NO'}, confidence=${kp.score.toFixed(3)}`);
            } else {
              console.log(`[FACIAL] ${name}: NOT FOUND`);
            }
          });
          
          // ✅ LOG SHOULDER AND HIP VISIBILITY
          const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
          const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
          const leftHip = keypoints.find(kp => kp.name === 'left_hip');
          const rightHip = keypoints.find(kp => kp.name === 'right_hip');
          
          console.log("=== BODY STRUCTURE VISIBILITY ===");
          console.log(`[SHOULDERS] Left: ${leftShoulder ? `visible (${leftShoulder.score.toFixed(3)})` : 'NOT DETECTED'}, Right: ${rightShoulder ? `visible (${rightShoulder.score.toFixed(3)})` : 'NOT DETECTED'}`);
          console.log(`[HIPS] Left: ${leftHip ? `visible (${leftHip.score.toFixed(3)})` : 'NOT DETECTED'}, Right: ${rightHip ? `visible (${rightHip.score.toFixed(3)})` : 'NOT DETECTED'}`);
          console.log(`[BODY CORE] Both shoulders visible: ${leftShoulder && rightShoulder && leftShoulder.score > 0.5 && rightShoulder.score > 0.5 ? 'YES' : 'NO'}`);
          console.log(`[BODY CORE] Both hips visible: ${leftHip && rightHip && leftHip.score > 0.5 && rightHip.score > 0.5 ? 'YES' : 'NO'}`);
          
          // ✅ LOG ORIENTATION DETECTION FOR CURRENT STEP
          console.log(`[ORIENTATION DETECTION] Current step: ${currentStep}`);
          if (currentStep === 'front') {
            console.log(`[FRONT DETECTION] Looking for: face-forward pose, both shoulders visible, arms extended`);
          } else if (currentStep === 'side') {
            console.log(`[SIDE DETECTION] Looking for: profile pose, one shoulder more prominent than other`);
          } else if (currentStep === 'back') {
            console.log(`[BACK DETECTION] Looking for: back-facing pose, shoulders visible from behind`);
          }
          
          keypoints.forEach((kp, i) => {
            if (kp.score > 0.5) {
              console.log(`[KEYPOINT ${i}] ${kp.name || i}: score=${kp.score.toFixed(3)}, x=${kp.x.toFixed(1)}, y=${kp.y.toFixed(1)}`);
            }
          });
        } else {
          console.log("[KEYPOINTS] No pose detected");
          console.log(`[ORIENTATION] No pose detected for step: ${currentStep}`);
          
          // Show toast only occasionally to avoid spam
          if (Math.random() < 0.1) { // 10% chance to show toast
            toast({
              title: "Make sure your full body is centered and clearly visible before continuing.",
              description: "Check camera & lighting",
              variant: "destructive"
            });
          }
        }
        
        if (poses.length > 0) {
          const pose = poses[0] as DetectedPose;
          setPoseDetected(pose);
          
          console.log('[POSE FRAME] Using pose with', pose.keypoints.length, 'keypoints, score:', pose.score?.toFixed(3));
          
          // ✅ Use improved analyzePoseAlignment function instead of outdated binary validators
          const alignment = analyzePoseAlignment(pose);
          setAlignmentFeedback(alignment);
          
          console.log('[POSE FRAME] Alignment result:', alignment.isAligned, 'score:', alignment.alignmentScore?.toFixed(3), 'feedback:', alignment.feedback);
          console.log('[POSE FRAME] Misaligned limbs:', alignment.misalignedLimbs);
          
          // Only count frames where alignment is actually achieved
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

    if (stream && poseDetectionReady && isPoseDetectionEnabled && !showWeightModal) {
      console.log('[POSE FRAME] 🚀 Starting pose detection loop');
      animationFrameRef.current = requestAnimationFrame(detectPoseRealTime);
    }

    return () => {
      if (animationFrameRef.current) {
        console.log('[POSE FRAME] 🛑 Cleaning up animation frame');
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stream, poseDetectionReady, isPoseDetectionEnabled, showWeightModal, analyzePoseAlignment]);

  // Cleanup navigation timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, []);

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
          facingMode: 'environment', // Always use rear camera
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
      
      // ✅ Block success if pose is misaligned
      if (!alignmentFeedback?.isAligned) {
        toast({
          title: "Hold on!",
          description: "Make sure your full body is centered and clearly visible before continuing.",
          variant: "destructive",
        });
        return;
      }
      
      // Set success screen state to trigger the Continue button flow
      if (!scanCompleted && !isCompletionInProgress && !scanCompleteRef.current) {
        console.log("✅ Showing success screen");
        setSavedScanUrl(publicUrl);
        setShowSuccessScreen(true);
      } else {
        console.log("⚠️ Skipping success screen — scan already completed");
      }
      
      console.log('🎯 Success screen check completed:', { 
        savedScanUrl: !!publicUrl, 
        showSuccessScreen: !scanCompleted && !isCompletionInProgress && !scanCompleteRef.current, 
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

  // Function to capture and save body scan - now using canvas.toBlob() for iOS safety
  const saveBodyScanToSupabase = async (imageDataUrl: string) => {
    console.log("📸 Starting saveBodyScanToSupabase");
    
    try {
      setIsSaving(true);
      setErrorSavingScan(null);
      
      // ✅ 1. Add image data URL validation before processing
      if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image')) {
        console.error('❌ Invalid or empty image dataUrl:', imageDataUrl);
        alert("Image capture failed. Please try again.");
        setErrorSavingScan("Invalid image data");
        setIsSaving(false);
        return;
      }
      console.log("📸 Image data URL starts with:", imageDataUrl?.substring(0, 100));
      
      // ✅ 2. Use canvas.toBlob() instead of fetch(dataUrl) for iOS safety
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error("❌ Canvas not ready");
        alert("Canvas not ready. Try again.");
        setErrorSavingScan("Canvas not available");
        setIsSaving(false);
        return;
      }

      console.log("✅ Canvas dimensions:", { 
        width: canvas.width, 
        height: canvas.height 
      });

      // Use canvas.toBlob() for more reliable image conversion
      canvas.toBlob((blob) => {
        // ✅ 4. Prevent Supabase upload if Blob is invalid
        if (!blob || blob.size < 1000 || blob.type !== 'image/jpeg') {
          console.error("❌ Blob capture failed or was too small:", blob);
          console.error("❌ Blob details:", {
            exists: !!blob,
            size: blob?.size || 0,
            type: blob?.type || 'unknown'
          });
          alert("Invalid image detected. Please try scanning again.");
          setErrorSavingScan("Image too small or invalid");
          setIsSaving(false);
          return;
        }

        console.log("✅ Blob created successfully:", {
          size: blob.size,
          type: blob.type
        });

        // ✅ Continue with Supabase upload
        uploadBodyScan(blob).catch((uploadError) => {
          console.error("📛 Upload failed:", uploadError);
          setIsSaving(false);
        });

      }, 'image/jpeg', 0.95);

    } catch (error) {
      // ✅ 3. Improve all error logs to include more context
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
        } : null
      });
      
      setErrorSavingScan(errorMessage);
      alert("Error saving scan: " + errorMessage);
      toast({
        title: "Save Error",
        description: `Failed to save body scan: ${errorMessage}`,
        variant: "destructive"
      });
      setIsSaving(false);
    }
  };

  // Complete the full body scan with weight
  const completeFullBodyScan = async () => {
    if (scanCompleteRef.current || scanCompleted || isCompletionInProgress) {
      console.log("🛑 Scan already completed, skipping.");
      return;
    }

    scanCompleteRef.current = true;

    if (!weight.trim()) {
      scanCompleteRef.current = false;
      toast({
        title: "Weight Required",
        description: "Please enter your current weight",
        variant: "destructive"
      });
      return;
    }

    try {
      setScanCompleted(true);
      setIsCompletionInProgress(true);
      setIsCompletingScan(true);
      setShowWeightModal(false);
      setIsPoseDetectionEnabled(false);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      setShowFinalLoading(true);
      console.log('🧠 [AI LOADING] Starting post-scan analysis...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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

      const { error: dbError } = await supabase
        .from('body_scans')
        .insert({
          user_id: user.id,
          image_url: capturedImages.front || '',
          side_image_url: capturedImages.side,
          back_image_url: capturedImages.back,
          weight: parseFloat(weight),
          scan_index: nextScanIndex,
          year: currentYear,
          month: currentMonth,
          type: 'complete'
        });

      if (dbError) throw dbError;

      await supabase.rpc('update_body_scan_reminder', {
        p_user_id: user.id,
        p_scan_date: new Date().toISOString()
      });

      console.log('🎉 Body scan completed successfully');

      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
      }

      navigationTimeoutRef.current = setTimeout(() => {
        console.log('🧠 [AI LOADING] Navigating to result page');
        navigate('/body-scan-result', {
          state: {
            date: new Date(),
            weight: parseFloat(weight)
          }
        });
        navigationTimeoutRef.current = null;
      }, 2500);

    } catch (error) {
      console.error('Error completing body scan:', error);
      scanCompleteRef.current = false;
      setScanCompleted(false);
      setIsCompletionInProgress(false);
      setIsCompletingScan(false);
      setShowFinalLoading(false);
      setShowWeightModal(true);
      toast({
        title: "Error",
        description: "Failed to complete body scan. Please try again.",
        variant: "destructive"
      });
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

  // ✅ REMOVED: Outdated binary alignment functions (isFrontAligned, isSideAligned, isBackAligned, validateStrictPoseAlignment)
  // These have been replaced with the improved analyzePoseAlignment function below

  // ✅ REMOVED: Duplicate analyzePoseAlignment function (moved above useEffect)

  const drawPoseOverlay = useCallback((pose: DetectedPose, alignment: AlignmentFeedback) => {
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
  }, []);

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

  const handleContinue = async () => {
    console.log('➡️ Continue clicked');

    // Check both state and ref
    if (scanCompleted || isCompletionInProgress || scanCompleteRef.current) {
      console.log('⚠️ [CONTINUE] Scan already completed or in progress');
      return;
    }

    if (!hasImageReady || !savedScanUrl) {
      console.warn('❌ handleContinue: Invalid state');
      return;
    }

    setIsTransitioning(true);

    // Reset all capture-related states
    setCapturedImage(null);
    setHasImageReady(false);
    setAlignmentConfirmed(false);
    setCountdownSeconds(0);
    setIsCountingDown(false);
    setShowSuccessScreen(false);
    setSavedScanUrl(null);
    setIsCapturing(false);
    setAlignmentFrameCount(0);
    setPoseDetected(null);
    setAlignmentFeedback(null);

    setTimeout(() => {
      if (currentStep === 'front') {
        setCurrentStep('side');
        toast({
          title: "📸 Great! Now turn sideways",
          description: "Position yourself sideways for the side view photo",
          duration: 4000,
        });
      } else if (currentStep === 'side') {
        setCurrentStep('back');
        toast({
          title: "📸 Awesome! Now turn around",
          description: "Turn around so we can capture your back view",
          duration: 4000,
        });
      } else if (currentStep === 'back') {
        // CRITICAL FIX: Check all guards before showing modal
        if (!scanCompleted && !isCompletionInProgress && !showWeightModal && !scanCompleteRef.current) {
          console.log("✅ Showing scan complete modal");
          setShowWeightModal(true);
        } else {
          console.log("⚠️ Skipping weight modal - scan already completed");
        }
      }

      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }, 200);
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

  // Camera toggle function removed - always uses rear camera

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
      
      {/* STEP 5: CANVAS WITH LIME BORDER */}
      <canvas 
        ref={overlayCanvasRef}
        style={{
          border: '3px solid lime',
          position: 'absolute',
          zIndex: showSuccessScreen || showWeightModal ? -1 : 99,
          top: 0,
          opacity: showSuccessScreen || showWeightModal ? 0 : 1,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          display: showWeightModal ? 'none' : 'block'
        }}
      />
      
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

      {/* Simplified Progress Indicator - Only Progress Bars */}
      <div className={`absolute top-4 md:top-6 left-4 right-4 z-20 transition-all duration-700 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {/* Progress Bars Only */}
        <div className="bg-black/60 backdrop-blur-sm rounded-xl p-2 border border-white/20 mb-3 transition-all duration-500">
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
        <div key={currentStep} className={`bg-black/60 backdrop-blur-sm rounded-2xl p-3 border transition-all duration-700 animate-fade-in ${currentStepConfig.borderColor}`}>
          <div className="text-center relative">
            {/* Step Title with Gradient */}
            <h2 className={`text-white text-lg font-bold mb-1 bg-gradient-to-r ${currentStepConfig.theme} bg-clip-text text-transparent`}>
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
      <div key={currentStep} className={`absolute inset-0 flex items-center justify-center pt-1 pb-4 z-15 transition-all duration-1000 ${isTransitioning ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
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
                ? sideBodySilhouette
                : "/lovable-uploads/f79fe9f7-e1df-47ea-bdca-a4389f4528f5.png"
            }
            alt={`${currentStep} body silhouette`}
            className={`w-[140vw] max-h-[80vh] h-auto object-contain animate-fade-in relative z-10 ${
              currentStep === 'front' ? 'opacity-90 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] drop-shadow-[0_0_16px_rgba(59,130,246,0.6)]' :
              currentStep === 'side' ? 'opacity-90 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)] drop-shadow-[0_0_16px_rgba(34,197,94,0.6)]' :
              'opacity-90 drop-shadow-[0_0_8px_rgba(147,51,234,0.8)] drop-shadow-[0_0_16px_rgba(147,51,234,0.6)]'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      </div>

      {/* Enhanced Step Success Screen with Cinematic Effects */}
      {showSuccessScreen && savedScanUrl && ((() => {
        console.log('🎯 Rendering success screen:', { showSuccessScreen, savedScanUrl: !!savedScanUrl, currentStep });
        return true;
      })()) && (
        <div key={currentStep} className={`absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-6 animate-fade-in`}>
          <div className={`bg-gradient-to-br ${currentStepConfig.theme} bg-opacity-20 backdrop-blur-md rounded-3xl p-8 text-center max-w-sm border-2 ${currentStepConfig.borderColor} shadow-2xl animate-scale-in`}>
            {/* Success Icon with Step-specific Color */}
            <div className="text-6xl mb-6 animate-bounce">{currentStepConfig.icon}</div>
            
            {/* Step Success Title */}
            <h3 className="text-white text-2xl font-bold mb-2">
              {currentStepConfig.title.split(' ')[1]} {currentStepConfig.title.split(' ')[2]} Complete!
            </h3>
            <p className="text-white/80 text-sm mb-6">Scan saved successfully</p>
            
            {/* Enhanced Thumbnail with Step Theming */}
            <div className={`mb-6 rounded-2xl overflow-hidden border-3 ${currentStepConfig.borderColor} shadow-lg`}>
              <img 
                src={savedScanUrl}
                alt={`${currentStep} body scan`}
                className="w-full h-40 object-cover"
              />
            </div>
            
            {/* Enhanced Action Buttons */}
            <div className="space-y-4">
              <Button
                onClick={handleContinue}
                className={`w-full bg-gradient-to-r ${currentStepConfig.theme} hover:scale-105 text-white font-bold py-4 text-lg shadow-lg transition-all duration-300`}
              >
                {currentStep === 'front' ? '🚶 Continue to Side Scan' : 
                 currentStep === 'side' ? '🔄 Continue to Back Scan' : 
                 '🎉 Complete All Scans'}
              </Button>
              <Button
                onClick={handleRetake}
                variant="outline"
                className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 transition-all duration-300"
              >
                🔁 Retake {currentStepConfig.title.split(' ')[1]} Scan
              </Button>
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

      {/* Camera toggle button removed - always uses rear camera */}

      {/* Fixed Bottom Controls - Matching Health Scanner */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent z-20">
        <div className="flex flex-col space-y-4">
          {/* Alignment feedback overlay - positioned above cancel button */}
          {alignmentFeedback && !alignmentFeedback.isAligned && !hasImageReady && (
            <div className="mx-2">
              <div className={`backdrop-blur-sm rounded-2xl p-3 border transition-all duration-500 ease-in-out ${
                alignmentFeedback.alignmentScore >= 0.7 
                  ? 'bg-yellow-500/90 border-yellow-400' 
                  : alignmentFeedback.alignmentScore >= 0.6
                  ? 'bg-orange-500/90 border-orange-400' 
                  : 'bg-red-500/90 border-red-400'
              }`}>
                <h3 className="text-white font-bold mb-1 flex items-center text-sm">
                  {alignmentFeedback.alignmentScore >= 0.7 ? '🟡' : alignmentFeedback.alignmentScore >= 0.6 ? '⚠️' : '❌'} 
                  {alignmentFeedback.alignmentScore >= 0.7 ? ' Almost There!' : ' Pose Alignment'}
                </h3>
                <p className="text-white text-xs mb-1">
                  Score: {Math.round(alignmentFeedback.alignmentScore * 100)}%
                </p>
                <p className="text-white text-xs font-medium">
                  {alignmentFeedback.feedback}
                </p>
              </div>
            </div>
          )}

          {/* Perfect pose indicator - positioned above cancel button */}
          {alignmentFeedback?.isAligned && !hasImageReady && (
            <div className="mx-2">
              <div className="bg-green-500/90 backdrop-blur-sm rounded-2xl p-3 border border-green-400 transition-all duration-500 ease-in-out">
                <div className="text-center">
                  <div className="text-xl mb-1 animate-pulse">✅</div>
                  <p className="text-white font-bold text-sm">Great Pose!</p>
                  <p className="text-white text-xs">Hold steady for auto-capture...</p>
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

          {/* Cancel Button */}
          <Button
            onClick={handleCancel}
            className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl border-2 border-red-500 transition-all duration-300"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </Button>

          {/* Upload and Capture buttons removed - auto-capture only */}
        </div>
      </div>

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
      
      {/* Weight Input Modal - Only show if scan not completed */}
      {showWeightModal && !scanCompleted && !scanCompleteRef.current && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background dark:bg-card rounded-lg p-6 max-w-sm w-full border border-border">
            <h3 className="text-xl font-bold mb-2 text-center text-foreground">🎉 Body Scan Complete!</h3>
            <p className="text-muted-foreground mb-4 text-center text-sm">
              We've saved your front, side, and back body scans. Our AI will now analyze your posture and muscle symmetry to help you improve performance and reduce injury risk.
            </p>
            <p className="text-muted-foreground mb-4 text-center text-sm">
              📅 We'll remind you in 30 days to take your next scan and track your progress over time.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-foreground">Current weight (lbs or kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter your weight"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
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

      {/* Final Loading Screen */}
      {showFinalLoading && scanCompleteRef.current && <BodyScanLoadingScreen />}

    </div>
  );
}
