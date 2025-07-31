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
  score?: number; // Make optional to match TensorFlow types
  name?: string;  // Make optional to match TensorFlow types
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

  // ✅ 1. Enhanced pose detection with detailed logging for front, side, and back views
  const detectPoseRealTime = useCallback(async () => {
    // ✅ 7. Strengthen Guards - Stop immediately if success shown or fading out
    if (showSuccessScreen || isScanningFadingOut) {
      console.log('⏹️ Pose detection stopped: success or fade-out state');
      return;
    }

    if (!videoRef.current || 
        !poseDetectorRef.current || 
        !isPoseDetectionEnabled ||
        isCountingDown ||
        hasImageReady) {
      console.log('[POSE] Skipping detection - conditions not met');
      return;
    }

    const video = videoRef.current;
    
    // Video readiness check
    if (video.readyState < 2) {
      console.log('[POSE] Video not ready for detection');
      return;
    }

    try {
      // ✅ Estimate poses using the initialized detector
      console.log('[POSE] Starting pose estimation...');
      const poses = await poseDetectorRef.current.estimatePoses(video);
      
      if (poses && poses.length > 0) {
        const pose = poses[0];
        console.log(`[POSE] Detected pose with ${pose.keypoints.length} keypoints, score: ${pose.score.toFixed(3)}`);
        
        setPoseDetected(pose as DetectedPose);
        
        // ✅ Analyze pose alignment (front/side/back specific)
        const alignmentResult = analyzeSidePoseAlignment(pose as DetectedPose);
        console.log(`[ALIGNMENT] Score: ${alignmentResult.alignmentScore.toFixed(3)}, Aligned: ${alignmentResult.isAligned}`);
        setAlignmentFeedback(alignmentResult);
        
        // ✅ Draw pose overlay if conditions are met
        drawPoseOverlay(pose as DetectedPose);
        
        // ✅ Handle alignment confirmation and auto-capture
        if (alignmentResult.isAligned && !isCountingDown && !hasImageReady) {
          setAlignmentFrameCount(prev => {
            const newCount = prev + 1;
            console.log(`[ALIGNMENT] Frame count: ${newCount}/5`);
            
            if (newCount >= 5 && !alignmentConfirmed) { // 5 frames of alignment
              console.log('🎯 ALIGNMENT CONFIRMED - Starting countdown');
              setAlignmentConfirmed(true);
              setIsCountingDown(true);
              setCountdownSeconds(3);
              
              // ✅ Countdown timer with audio feedback
              const countdownInterval = setInterval(() => {
                setCountdownSeconds(prev => {
                  if (prev <= 1) {
                    clearInterval(countdownInterval);
                    console.log('📸 AUTO-CAPTURING!');
                    captureImage();
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);
            }
            
            return newCount;
          });
        } else if (!alignmentResult.isAligned) {
          // Reset alignment if pose becomes misaligned
          setAlignmentFrameCount(0);
          setAlignmentConfirmed(false);
        }
        
      } else {
        console.log('[POSE] No poses detected in frame');
        setPoseDetected(null);
        setAlignmentFeedback({
          isAligned: false,
          misalignedLimbs: ['no_pose'],
          alignmentScore: 0,
          feedback: 'Please position yourself in front of the camera'
        });
      }
      
    } catch (error) {
      console.error('[POSE ERROR] Detection failed:', error);
      setAlignmentFeedback({
        isAligned: false,
        misalignedLimbs: ['detection_error'],
        alignmentScore: 0,
        feedback: 'Pose detection temporarily unavailable'
      });
    }
  }, [isPoseDetectionEnabled, isCountingDown, hasImageReady, showSuccessScreen, isScanningFadingOut]);

  // ✅ Real-time pose detection loop with cleanup and guards
  useEffect(() => {
    if (!stream || !poseDetectionReady || !isPoseDetectionEnabled) {
      console.log('[POSE LOOP] Conditions not met for pose detection');
      return;
    }

    // ✅ 7. Enhanced guards - Stop loop during success/transition states
    if (showSuccessScreen || isScanningFadingOut) {
      console.log('⏹️ Pose detection loop stopped due to success/fade-out state');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let isActive = true;
    
    const runDetection = async () => {
      if (isActive && !showSuccessScreen && !isScanningFadingOut) {
        await detectPoseRealTime();
        
        if (isActive && !showSuccessScreen && !isScanningFadingOut) {
          animationFrameRef.current = requestAnimationFrame(runDetection);
        }
      }
    };

    runDetection();

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [stream, poseDetectionReady, isPoseDetectionEnabled, showSuccessScreen, isScanningFadingOut]);

  // ✅ 2. Enhanced pose alignment analysis for side scan step
  const analyzeSidePoseAlignment = (pose: DetectedPose): AlignmentFeedback => {
    const keypoints = pose.keypoints;
    const requiredConfidence = 0.3;
    
    // Get important keypoints with safe access
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
    const leftHip = keypoints.find(kp => kp.name === 'left_hip');
    const rightHip = keypoints.find(kp => kp.name === 'right_hip');
    const nose = keypoints.find(kp => kp.name === 'nose');
    const leftEye = keypoints.find(kp => kp.name === 'left_eye');
    const rightEye = keypoints.find(kp => kp.name === 'right_eye');

    let alignmentScore = 0;
    let misalignedLimbs: string[] = [];
    let feedback = '';

    // Basic pose quality check
    const validKeypoints = keypoints.filter(kp => kp.score && kp.score > requiredConfidence).length;
    if (validKeypoints < 8) {
      return {
        isAligned: false,
        misalignedLimbs: ['insufficient_visibility'],
        alignmentScore: validKeypoints / 17,
        feedback: 'Please ensure your full body is visible in the camera'
      };
    }

    // SIDE POSE VALIDATION - Check if user is turned fully sideways
    if (currentStep === 'side') {
      console.log('🔄 SIDE POSE VALIDATION ACTIVE');
      
      // For side pose, we want shoulders and hips to be mostly aligned in a vertical line
        if (leftShoulder && rightShoulder && leftHip && rightHip && 
            leftShoulder.score && leftShoulder.score > requiredConfidence && 
            rightShoulder.score && rightShoulder.score > requiredConfidence &&
            leftHip.score && leftHip.score > requiredConfidence && 
            rightHip.score && rightHip.score > requiredConfidence) {
        
        // Calculate if shoulders are aligned vertically (indicating side view)
        const shoulderXDiff = Math.abs(leftShoulder.x - rightShoulder.x);
        const hipXDiff = Math.abs(leftHip.x - rightHip.x);
        
        console.log(`[SIDE] Shoulder X diff: ${shoulderXDiff.toFixed(2)}, Hip X diff: ${hipXDiff.toFixed(2)}`);
        
        // For a good side pose, the X difference should be small (shoulders/hips aligned)
        const maxDiff = 50; // pixels
        const shouldersSideways = shoulderXDiff < maxDiff;
        const hipsSideways = hipXDiff < maxDiff;
        
        if (shouldersSideways && hipsSideways) {
          alignmentScore += 0.8;
          console.log('✅ SIDE: Shoulders and hips properly aligned sideways');
        } else {
          misalignedLimbs.push('not_sideways');
          console.log(`❌ SIDE: Not sideways enough - shoulders: ${shouldersSideways}, hips: ${hipsSideways}`);
        }
        
        // Check head position for side profile
        if (nose && leftEye && rightEye && 
            nose.score && nose.score > requiredConfidence && 
            leftEye.score && leftEye.score > requiredConfidence && 
            rightEye.score && rightEye.score > requiredConfidence) {
          
          const eyeXDiff = Math.abs(leftEye.x - rightEye.x);
          console.log(`[SIDE] Eye X diff: ${eyeXDiff.toFixed(2)}`);
          
          // For side profile, eyes should be close in X position
          if (eyeXDiff < 30) {
            alignmentScore += 0.2;
            console.log('✅ SIDE: Head in proper side profile');
          } else {
            misalignedLimbs.push('head_not_profile');
            console.log('❌ SIDE: Head not in side profile');
          }
        }
        
      } else {
        misalignedLimbs.push('insufficient_keypoints');
        alignmentScore = 0.1;
      }
      
      // Set feedback based on score
      if (alignmentScore >= 0.8) {
        feedback = '🟢 Perfect side pose! Hold steady...';
      } else if (alignmentScore >= 0.6) {
        feedback = '🟡 Almost there! Turn more sideways';
      } else {
        feedback = '🔄 Please turn fully sideways (right shoulder facing camera)';
      }
      
    } else {
      // FRONT/BACK POSE VALIDATION - Standard frontal alignment
      if (leftShoulder && rightShoulder && leftHip && rightHip && 
          leftShoulder.score && leftShoulder.score > requiredConfidence && 
          rightShoulder.score && rightShoulder.score > requiredConfidence &&
          leftHip.score && leftHip.score > requiredConfidence && 
          rightHip.score && rightHip.score > requiredConfidence) {
        
        // Check shoulder level alignment
        const shoulderYDiff = Math.abs(leftShoulder.y - rightShoulder.y);
        if (shoulderYDiff < 30) {
          alignmentScore += 0.3;
        } else {
          misalignedLimbs.push('uneven_shoulders');
        }
        
        // Check hip level alignment
        const hipYDiff = Math.abs(leftHip.y - rightHip.y);
        if (hipYDiff < 30) {
          alignmentScore += 0.3;
        } else {
          misalignedLimbs.push('uneven_hips');
        }
        
        // Check upright posture (shoulders above hips)
        const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        const avgHipY = (leftHip.y + rightHip.y) / 2;
        if (avgShoulderY < avgHipY) {
          alignmentScore += 0.2;
        } else {
          misalignedLimbs.push('posture');
        }
        
        // Check central alignment (symmetric distance from center)
        const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
        const hipCenterX = (leftHip.x + rightHip.x) / 2;
        const centerAlignment = Math.abs(shoulderCenterX - hipCenterX);
        if (centerAlignment < 20) {
          alignmentScore += 0.2;
        } else {
          misalignedLimbs.push('not_centered');
        }
        
      } else {
        misalignedLimbs.push('insufficient_keypoints');
        alignmentScore = 0.1;
      }
      
      // Set feedback for front/back poses
      if (alignmentScore >= 0.8) {
        feedback = currentStep === 'front' ? '✅ Perfect front pose!' : '✅ Perfect back pose!';
      } else if (alignmentScore >= 0.6) {
        feedback = '🟡 Almost perfect! Small adjustments needed';
      } else if (misalignedLimbs.includes('uneven_shoulders')) {
        feedback = '⚖️ Level your shoulders';
      } else if (misalignedLimbs.includes('posture')) {
        feedback = '🧍 Stand up straight';
      } else if (misalignedLimbs.includes('not_centered')) {
        feedback = '⬅️➡️ Center yourself in frame';
      } else {
        feedback = '📍 Position yourself in the outline';
      }
    }

    const isAligned = alignmentScore >= 0.8; // High threshold for quality
    
    console.log(`[ALIGNMENT RESULT] Step: ${currentStep}, Score: ${alignmentScore.toFixed(3)}, Aligned: ${isAligned}, Feedback: ${feedback}`);
    
    return {
      isAligned,
      misalignedLimbs,
      alignmentScore,
      feedback
    };
  };

  // ✅ 1. Enhanced drawPoseOverlay with early returns and improved guards
  const drawPoseOverlay = useCallback((pose: DetectedPose) => {
    // ✅ 1. Immediate early return if transitioning or success showing
    if (showSuccessScreen || isScanningFadingOut) {
      console.log('⏹️ DrawPoseOverlay: Early return due to success/fade-out state');
      return;
    }

    if (!overlayCanvasRef.current || !pose) {
      console.log('[DRAW] Canvas or pose not available');
      return;
    }

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('[DRAW] Could not get canvas context');
      return;
    }

    // ✅ 1. Clear canvas at start if fade-out is active
    if (isScanningFadingOut) {
      console.log('🧹 Clearing canvas during fade-out');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    console.log('[DRAW] Starting pose overlay drawing');
    
    // Enhanced keypoint drawing with better visibility
    ctx.fillStyle = '#00FF00';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    
    let drawnKeypoints = 0;
    pose.keypoints.forEach((keypoint) => {
      if (keypoint.score && keypoint.score > 0.3) { // Only draw confident keypoints
        const { x, y } = keypoint;
        
        // Draw keypoint as circle with border
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#00FF00';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        drawnKeypoints++;
      }
    });
    
    console.log(`[DRAW] Drew ${drawnKeypoints} GREEN KEYPOINT CIRCLES`);
    
    // Enhanced skeleton drawing with thicker, more visible lines
    const connections = [
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'],
      ['left_knee', 'left_ankle'],
      ['right_hip', 'right_knee'],
      ['right_knee', 'right_ankle']
    ];
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    
    let drawnConnections = 0;
    connections.forEach(([startName, endName]) => {
      const startPoint = pose.keypoints.find(kp => kp.name === startName);
      const endPoint = pose.keypoints.find(kp => kp.name === endName);
      
      if (startPoint && endPoint && 
          startPoint.score && startPoint.score > 0.3 && 
          endPoint.score && endPoint.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
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
    // Determine next step for logging
    const nextStep = currentStep === 'front' ? 'side' : 
                    currentStep === 'side' ? 'back' : 'weight modal';
    
    console.log('🧠 Continue pressed', { currentStep, advancingTo: nextStep });
    
    if (hasImageReady && savedScanUrl) {
      // Reset all relevant states immediately
      setCapturedImage(null);
      setHasImageReady(false);
      setSavedScanUrl(null);
      setAlignmentConfirmed(false);
      setShowSuccessScreen(false);
      setIsTransitioning(false);
      setShowShutterFlash(false);
      
      // Mark current step as completed
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      
      // Clean step transition system
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
        console.log('🎉 All scans completed - showing weight modal');
        setShowWeightModal(true);
      }
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

  // ✅ Enhanced image capture with cinematic transition effects
  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) {
      console.log('❌ Capture blocked: missing refs or already capturing');
      return;
    }

    console.log('🟡 Fade-out started');
    setIsCapturing(true);
    setIsScanningFadingOut(true);
    
    // ✅ 5. Stop pose detection loop instantly
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    try {
      // ✅ 2. Clear canvas at 100ms (before flash)
      setTimeout(() => {
        if (overlayCanvasRef.current) {
          const canvas = overlayCanvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            console.log('⚪ Canvas cleared');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      }, 100);

      // ✅ 3. Flash begins at 200ms
      setTimeout(() => {
        console.log('💡 Flash ON');
        setShowShutterFlash(true);
        playBodyScanCapture();
      }, 200);

      // ✅ 3. Flash ends at 350ms
      setTimeout(() => {
        setShowShutterFlash(false);
      }, 350);

      // ✅ 4. Show success popup at 450ms
      setTimeout(() => {
        const video = videoRef.current!;
        const canvas = canvasRef.current!;
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth || video.clientWidth;
        canvas.height = video.videoHeight || video.clientHeight;
        
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get the image data
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        
        console.log('📸 Image captured successfully', {
          width: canvas.width,
          height: canvas.height,
          dataLength: imageData.length
        });
        
        // ✅ Validate pose before marking as ready
        if (poseDetected && alignmentFeedback?.isAligned) {
          console.log('✅ Pose validation passed, marking image as ready');
          setHasImageReady(true);
        } else {
          console.log('❌ Pose validation failed');
          toast({
            title: "Pose Quality Issue",
            description: "Please ensure you're properly aligned and try again.",
            variant: "destructive"
          });
          
          // Reset states
          setIsCapturing(false);
          setIsScanningFadingOut(false);
          setIsCountingDown(false);
          setCountdownSeconds(0);
        }
      }, 450);

      // ✅ Reset scanning state at 700ms
      setTimeout(() => {
        setIsScanningFadingOut(false);
        setIsCountingDown(false);
        setCountdownSeconds(0);
      }, 700);

    } catch (error) {
      console.error('❌ Capture failed:', error);
      toast({
        title: "Capture Failed",
        description: "Failed to capture image. Please try again.",
        variant: "destructive"
      });
      
      setIsCapturing(false);
      setIsScanningFadingOut(false);
      setIsCountingDown(false);
      setCountdownSeconds(0);
    }
  }, [isCapturing, poseDetected, alignmentFeedback, playBodyScanCapture]);

  // ✅ Enhanced saveBodyScanToSupabase with proper error handling and success feedback
  const saveBodyScanToSupabase = async (imageData: string) => {
    if (!imageData) {
      console.error('❌ No image data to save');
      return;
    }

    setIsSaving(true);
    setErrorSavingScan(null);

    try {
      console.log('💾 Starting save to Supabase...');
      
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Convert data URL to blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `body-scan-${currentStep}-${timestamp}.jpg`;
      const filepath = `${user.id}/${filename}`;

      console.log('📤 Uploading to storage:', filepath);
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('body-scans')
        .upload(filepath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      console.log('✅ Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('body-scans')
        .getPublicUrl(filepath);

      console.log('🔗 Public URL:', publicUrl);

      // Save scan record to database
      const { data: scanData, error: scanError } = await supabase
        .from('body_scans')
        .insert({
          user_id: user.id,
          type: currentStep,
          image_url: publicUrl,
          pose_metadata: poseDetected ? JSON.parse(JSON.stringify({
            keypoints: poseDetected.keypoints,
            score: poseDetected.score
          })) : null,
          pose_score: alignmentFeedback?.alignmentScore || 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (scanError) {
        throw scanError;
      }

      console.log('✅ Scan record saved:', scanData);

      // Update state for success
      setSavedScanUrl(publicUrl);
      setCapturedImages(prev => ({
        ...prev,
        [currentStep]: publicUrl
      }));
      
      // ✅ 5. Show success screen after successful save
      setTimeout(() => {
        console.log('🎉 Popup shown');
        console.log('✅ Success screen is now visible');
        setShowSuccessScreen(true);
        setIsCapturing(false);
        showInstantFeedback(currentStep);
      }, 300);

    } catch (error) {
      console.error('❌ Save failed:', error);
      setErrorSavingScan(error.message || 'Unknown error');
      
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

    setIsCompletingScan(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update user profile with weight and scan completion
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          weight: parseFloat(weight),
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Mark all scan steps as completed
      setCompletedSteps(new Set(['front', 'side', 'back']));
      
      // Trigger completion notification
      triggerScanCompletedNotification('back');
      
      toast({
        title: "🎉 Body Scan Complete!",
        description: "Your full body scan has been saved. You can now track your progress over time.",
        duration: 5000,
      });

      // Navigate to results or dashboard
      setTimeout(() => {
        navigate('/dashboard');
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
    console.log('🔄 Success screen hidden by user retake action');
    setAlignmentFrameCount(0);
    setAlignmentConfirmed(false);
    setIsCountingDown(false);
    setCountdownSeconds(0);
    setIsSaving(false);
    setErrorSavingScan(null);
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
      {!showSuccessScreen && (
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
      )}

      {/* Enhanced Progress Indicator & Cinematic Header */}
      {!showSuccessScreen && (
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
      )}

      {/* Enhanced Dynamic Body Silhouette with Fixed Spacing */}
      {!showSuccessScreen && (
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
      )}

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
                onClick={() => {
                  console.log("👉 CONTINUE BUTTON CLICKED");
                  handleContinue();
                }}
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

      {/* Unified Success Screen */}
      {showSuccessScreen && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-40 animate-fade-in">
          <div className={`text-center animate-scale-in`}>
            <div className={`text-8xl mb-6 animate-bounce`}>{currentStepConfig.icon}</div>
            <h2 className={`text-4xl font-bold mb-4 bg-gradient-to-r ${currentStepConfig.theme} bg-clip-text text-transparent`}>
              {currentStep === 'front' ? 'Front Scan Complete' : 
               currentStep === 'side' ? 'Side Scan Complete' : 
               'Back Scan Complete'}
            </h2>
            <div className="text-white/60 text-lg mb-8">
              {currentStep === 'front' ? '→ Preparing Side' : 
               currentStep === 'side' ? '→ Preparing Back' : 
               '→ Continue to Weight'}
            </div>
            
            {/* Continue Button */}
            <Button
              onClick={() => {
                console.log("👉 CONTINUE BUTTON CLICKED");
                handleContinue();
              }}
              className={`w-full bg-gradient-to-r ${currentStepConfig.theme} hover:scale-[1.02] text-white font-bold py-5 text-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-white/20`}
            >
              {currentStep === 'front' ? '🚶 Continue to Side Scan' : 
               currentStep === 'side' ? '🔄 Continue to Back Scan' : 
               '🎉 Complete All Scans'}
            </Button>
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
      {!showSuccessScreen && (
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
      )}

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
    </div>
  );
}