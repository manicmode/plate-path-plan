
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

  // Initialize pose detection
  useEffect(() => {
    const initializePoseDetection = async () => {
      try {
        console.log('[POSE INIT] Starting TensorFlow.js initialization...');
        await tf.ready();
        await tf.setBackend('webgl');
        console.log('[POSE INIT] TensorFlow.js backend set to webgl');
        
        console.log('[POSE INIT] Loading pose detection model...');
        const model = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
            modelUrl: 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4',
          }
        );
        
        poseDetectorRef.current = model;
        setPoseDetectionReady(true);
        
        // STEP 3: MODEL LOADED DEBUG
        console.log('[MODEL] Model loaded', model);
        console.log('[MODEL] Model type:', typeof model);
        console.log('[MODEL] Model methods:', Object.getOwnPropertyNames(model));
        
        toast({
          title: "✅ Pose Detection Ready",
          description: "AI-powered pose alignment is now active",
        });
      } catch (error) {
        console.error('[POSE INIT] ❌ Failed to initialize pose detection:', error);
        
        toast({
          title: "❌ Pose detection failed to load",
          description: "Model initialization error. Basic capture only.",
          variant: "destructive"
        });
        setIsPoseDetectionEnabled(false);
      }
    };

    initializePoseDetection();

    return () => {
      if (poseDetectorRef.current) {
        console.log('[POSE INIT] Disposing pose detector');
        poseDetectorRef.current.dispose();
      }
    };
  }, []);

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
      
      if (!videoRef.current || !poseDetectorRef.current || !isPoseDetectionEnabled || !poseDetectionReady) {
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
  }, [stream, poseDetectionReady, isPoseDetectionEnabled]);

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
  // Function to upload image to Supabase Storage and save record
  const saveBodyScanToSupabase = async (imageDataUrl: string) => {
    try {
      setIsSaving(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Convert data URL to blob/JPEG
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      // Create filename with timestamp as requested: ${user_id}/front-${Date.now()}.jpg
      const timestamp = Date.now();
      const fileName = `${user.id}/front-${timestamp}.jpg`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('body-scans')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true // Allow overwriting as requested
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL via Supabase client after upload
      const { data: urlData } = supabase.storage
        .from('body-scans')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      
      // Calculate pose metadata with specific structure
      const poseMetadata = {
        shouldersLevel: !alignmentFeedback?.misalignedLimbs.includes('shoulders'),
        armsRaised: !(alignmentFeedback?.misalignedLimbs.includes('left_arm') || alignmentFeedback?.misalignedLimbs.includes('right_arm')),
        alignmentScore: Math.round((alignmentFeedback?.alignmentScore || 0) * 100),
        poseConfidence: poseDetected?.score || 0,
        detectedKeypoints: poseDetected?.keypoints?.length || 0,
        cameraMode,
        captureTimestamp: new Date().toISOString()
      };

      // Save entry to body_scans table
      const { data: scanData, error: dbError } = await supabase
        .from('body_scans')
        .insert({
          user_id: user.id,
          type: 'front',
          image_url: publicUrl,
          pose_score: alignmentFeedback?.alignmentScore || 0,
          pose_metadata: poseMetadata
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      // Update UI state
      setSavedScanUrl(publicUrl);
      setShowSuccessScreen(true);
      
      // Trigger notifications
      await triggerScanCompletedNotification('front');
      await showInstantFeedback('front');
      
      // Show pose quality feedback
      showPoseQualityFeedback({
        poseScore: alignmentFeedback?.alignmentScore || 0,
        poseMetadata: {
          shouldersLevel: !alignmentFeedback?.misalignedLimbs.includes('shoulders'),
          armsRaised: alignmentFeedback?.misalignedLimbs.includes('left_arm') || alignmentFeedback?.misalignedLimbs.includes('right_arm'),
          alignmentScore: Math.round((alignmentFeedback?.alignmentScore || 0) * 100),
          misalignedLimbs: alignmentFeedback?.misalignedLimbs || []
        }
      }, 'front');
      
      toast({
        title: "Front Scan Saved ✅",
        description: "Your body scan has been securely saved.",
      });

    } catch (error) {
      console.error('Error saving body scan:', error);
      toast({
        title: "Save Error",
        description: "Failed to save body scan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
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
    
    const alignmentThreshold = 0.2; // 20% tolerance (increased from 15%)
    const misalignedLimbs: string[] = [];
    let feedback = "";
    
    // Find key landmarks
    const keypoints = pose.keypoints;
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
    const leftWrist = keypoints.find(kp => kp.name === 'left_wrist');
    const rightWrist = keypoints.find(kp => kp.name === 'right_wrist');
    const leftHip = keypoints.find(kp => kp.name === 'left_hip');
    const rightHip = keypoints.find(kp => kp.name === 'right_hip');
    const nose = keypoints.find(kp => kp.name === 'nose');
    
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
  }, []);

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

  const handleContinue = () => {
    if (hasImageReady && savedScanUrl) {
      // Store the saved scan URL instead of raw image data
      sessionStorage.setItem('frontBodyScanUrl', savedScanUrl);
      navigate('/body-scan-side');
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

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden portrait:block landscape:hidden">
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
          zIndex: 99,
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          display: 'block'
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

      {/* Header Instructions - Fixed at top with proper spacing */}
      <div className="absolute top-4 md:top-6 left-4 right-4 z-20">
        <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
          <h2 className="text-white text-lg font-bold mb-2 text-center">
            📸 Front Body Scan
          </h2>
          <p className="text-white/90 text-sm text-center">
            Stand upright with arms out. Match your body to the glowing outline.
          </p>
        </div>
      </div>

      
      {/* Body Silhouette Overlay - Vertically centered with bigger size */}
      <div className="absolute inset-0 flex items-center justify-center mt-[-4vh] z-15">
        <div className={`relative transition-all duration-500 ${
          isCapturing ? 'scale-105' : 'scale-100'
        } ${hasImageReady ? 'filter brightness-110 hue-rotate-60' : ''}`}>
          <img 
            src="/lovable-uploads/f79fe9f7-e1df-47ea-bdca-a4389f4528f5.png"
            alt=""
            className="w-[99vw] max-h-[88vh] h-auto opacity-90 object-contain animate-slow-pulse drop-shadow-[0_0_8px_rgba(0,255,255,0.8)] drop-shadow-[0_0_16px_rgba(0,255,255,0.6)] drop-shadow-[0_0_24px_rgba(0,255,255,0.4)]"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      </div>

      {/* Capture success overlay with image preview */}
      {showSuccessScreen && savedScanUrl && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30 p-6">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 text-center max-w-sm">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-white text-xl font-bold mb-4">Front Scan Saved!</h3>
            
            {/* Thumbnail preview */}
            <div className="mb-6 rounded-2xl overflow-hidden border-2 border-green-400/50">
              <img 
                src={savedScanUrl}
                alt="Front body scan"
                className="w-full h-32 object-cover"
              />
            </div>
            
            {/* Action buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleContinue}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3"
              >
                Continue to Back Scan 🔜
              </Button>
              <Button
                onClick={handleRetake}
                variant="outline"
                className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Retake Front Scan 🔁
              </Button>
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

          {/* Main Action Button */}
          <Button
            onClick={hasImageReady ? handleContinue : captureImage}
            disabled={
              isCapturing || 
              isSaving ||
              (isPoseDetectionEnabled && (!alignmentFeedback || !alignmentFeedback.isAligned)) ||
              isCountingDown ||
              showSuccessScreen
            }
            className={`relative bg-gradient-to-r transition-all duration-300 disabled:opacity-50 text-white font-bold py-4 text-lg border-2 ${
              // Button color logic based on alignmentFeedback
              (!isPoseDetectionEnabled) 
                ? 'from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 border-green-400'
                : (alignmentFeedback === null)
                ? 'from-gray-500 to-gray-600 border-gray-400 cursor-not-allowed'
                : (alignmentFeedback.isAligned === false)
                ? 'from-gray-500 to-gray-600 border-gray-400 cursor-not-allowed'
                : 'from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 border-green-400 shadow-[0_0_20px_rgba(61,219,133,0.4)]'
            }`}
          >
            <div className="flex items-center justify-center">
              {showSuccessScreen ? (
                <>
                  <ArrowRight className="w-6 h-6 mr-3" />
                  🚀 Continue to Side Scan
                </>
              ) : hasImageReady ? (
                <>
                  <div className={`w-6 h-6 mr-3 ${isSaving ? 'animate-spin' : ''}`}>
                    {isSaving ? '💾' : '✅'}
                  </div>
                  {isSaving ? 'Saving Scan...' : 'Scan Saved!'}
                </>
              ) : (
                <>
                  <div className={`w-6 h-6 mr-3 ${isCapturing || isCountingDown ? 'animate-spin' : 'animate-pulse'}`}>⚡</div>
                  {isCountingDown ? `🔍 AUTO-CAPTURING IN ${countdownSeconds}...` : 
                   isCapturing ? '🔍 SCANNING...' : 
                   '📸 Capture Front View'}
                  {/* Pose alignment indicator */}
                  {isPoseDetectionEnabled && alignmentFeedback && (
                    <span className="ml-2">
                      {alignmentFeedback.isAligned ? '✅' : '⚠️'}
                    </span>
                  )}
                </>
              )}
            </div>
            {!hasImageReady && !isCapturing && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                           animate-[shimmer_2s_ease-in-out_infinite] rounded-lg"></div>
            )}
          </Button>
        </div>
      </div>

      {/* Alignment feedback overlay */}
      {alignmentFeedback && !alignmentFeedback.isAligned && !hasImageReady && (
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
              {alignmentFeedback.feedback}
            </p>
          </div>
        </div>
      )}

      {/* Perfect pose indicator */}
      {alignmentFeedback?.isAligned && !hasImageReady && (
        <div className="absolute top-1/2 left-4 right-4 z-25 transform -translate-y-1/2">
          <div className="bg-green-500/90 backdrop-blur-sm rounded-2xl p-4 border border-green-400 transition-all duration-500 ease-in-out transform scale-105">
            <div className="text-center">
              <div className="text-2xl mb-2 animate-pulse">✅</div>
              <p className="text-white font-bold text-lg">Great Pose!</p>
              <p className="text-white text-sm">Hold steady for auto-capture...</p>
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
      
      {/* Scan Tips Modal */}
      <ScanTipsModal 
        isOpen={tipsModal.isOpen} 
        onClose={tipsModal.onClose} 
      />
    </div>
  );
}
