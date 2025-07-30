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
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

type ScanView = 'front' | 'side' | 'back';

interface CapturedScan {
  type: ScanView;
  imageUrl: string;
  poseScore: number;
  poseMetadata: any;
}

export default function BodyScanGuided() {
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
  
  // Camera and capture state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>('environment');
  const [showOrientationWarning, setShowOrientationWarning] = useState(false);
  
  // Pose detection state
  const [poseDetected, setPoseDetected] = useState<DetectedPose | null>(null);
  const [alignmentFeedback, setAlignmentFeedback] = useState<AlignmentFeedback | null>(null);
  const [isPoseDetectionEnabled, setIsPoseDetectionEnabled] = useState(true);
  const [poseDetectionReady, setPoseDetectionReady] = useState(false);
  
  // Guided flow state
  const [currentView, setCurrentView] = useState<ScanView>('front');
  const [capturedScans, setCapturedScans] = useState<CapturedScan[]>([]);
  const [validPoseTimer, setValidPoseTimer] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  const scanViewNames = {
    front: 'Front View',
    side: 'Side View', 
    back: 'Back View'
  };

  const scanInstructions = {
    front: 'Stand facing the camera with arms at your sides',
    side: 'Great! Now please turn sideways for a side view photo',
    back: 'Awesome! Now please turn around so we can capture your back view'
  };

  const progress = ((capturedScans.length) / 3) * 100;

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraMode]);

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
        console.log('Initializing TensorFlow.js...');
        await tf.ready();
        await tf.setBackend('webgl');
        
        console.log('Loading pose detection model...');
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
          }
        );
        
        poseDetectorRef.current = detector;
        setPoseDetectionReady(true);
        console.log('Pose detection initialized successfully');
        
        toast({
          title: "Pose Detection Ready",
          description: "AI-powered pose alignment is now active",
        });
      } catch (error) {
        console.error('Failed to initialize pose detection:', error);
        toast({
          title: "Pose Detection Error",
          description: "AI features disabled. Basic capture still available.",
          variant: "destructive"
        });
        setIsPoseDetectionEnabled(false);
      }
    };

    initializePoseDetection();

    return () => {
      if (poseDetectorRef.current) {
        poseDetectorRef.current.dispose();
      }
    };
  }, []);

  // Real-time pose detection loop
  useEffect(() => {
    let lastTime = 0;
    const FPS_LIMIT = 15; // 15 FPS for mobile performance
    const frameInterval = 1000 / FPS_LIMIT;

    const detectPoseRealTime = async (currentTime: number) => {
      if (!videoRef.current || !poseDetectorRef.current || !isPoseDetectionEnabled || !poseDetectionReady) {
        animationFrameRef.current = requestAnimationFrame(detectPoseRealTime);
        return;
      }

      if (currentTime - lastTime < frameInterval) {
        animationFrameRef.current = requestAnimationFrame(detectPoseRealTime);
        return;
      }

      try {
        const poses = await poseDetectorRef.current.estimatePoses(videoRef.current);
        
        if (poses.length > 0) {
          const pose = poses[0] as DetectedPose;
          setPoseDetected(pose);
          
          // Analyze alignment based on current view
          const alignment = analyzePoseAlignment(pose, currentView);
          setAlignmentFeedback(alignment);
          
          // Draw pose overlay
          drawPoseOverlay(pose, alignment);
          
          // Handle valid pose timing
          if (alignment.isAligned) {
            setValidPoseTimer(prev => prev + frameInterval);
          } else {
            setValidPoseTimer(0);
            setIsCountingDown(false);
            setCountdownSeconds(0);
          }
        } else {
          setPoseDetected(null);
          setAlignmentFeedback(null);
          setValidPoseTimer(0);
          setIsCountingDown(false);
          setCountdownSeconds(0);
        }
      } catch (error) {
        console.error('Pose detection error:', error);
      }

      lastTime = currentTime;
      animationFrameRef.current = requestAnimationFrame(detectPoseRealTime);
    };

    if (stream && poseDetectionReady && isPoseDetectionEnabled) {
      animationFrameRef.current = requestAnimationFrame(detectPoseRealTime);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stream, poseDetectionReady, isPoseDetectionEnabled, currentView]);

  // Auto-capture countdown logic
  useEffect(() => {
    if (validPoseTimer >= 2000 && !isCountingDown && capturedScans.length < 3) { // 2 seconds of valid pose
      setIsCountingDown(true);
      setCountdownSeconds(3);
      
      const countdownInterval = setInterval(() => {
        setCountdownSeconds(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setIsCountingDown(false);
            // Auto capture
            if (alignmentFeedback?.isAligned) {
              captureImage();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [validPoseTimer, isCountingDown, capturedScans.length, alignmentFeedback]);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      console.log("[CAMERA] Requesting camera stream...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { exact: cameraMode },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      });
      
      console.log("[CAMERA] Stream received:", mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        try {
          await videoRef.current.play();
          console.log("[CAMERA] Video playing successfully");
        } catch (playError) {
          console.error("[CAMERA] Video autoplay prevented:", playError);
        }
      }
      setStream(mediaStream);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Pose validation before capture
    if (isPoseDetectionEnabled && alignmentFeedback && !alignmentFeedback.isAligned) {
      toast({
        title: "Pose Alignment Issue",
        description: `Please adjust: ${alignmentFeedback.feedback}`,
        variant: "destructive"
      });
      return;
    }
    
    setIsCapturing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Play capture sound
    playBodyScanCapture();
    
    // Save the scan to Supabase
    await saveBodyScanToSupabase(imageData, currentView);
    
    setIsCapturing(false);
    setValidPoseTimer(0);
    setIsCountingDown(false);
  };

  // Function to upload image to Supabase Storage and save record
  const saveBodyScanToSupabase = async (imageDataUrl: string, scanType: ScanView) => {
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
      
      // Create filename with timestamp
      const timestamp = Date.now();
      const fileName = `${user.id}/${scanType}-${timestamp}.jpg`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('body-scans')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('body-scans')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      
      // Calculate pose metadata
      const poseMetadata = {
        shouldersLevel: !alignmentFeedback?.misalignedLimbs.includes('shoulders'),
        armsRaised: !alignmentFeedback?.misalignedLimbs.includes('arms_position'),
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
          type: scanType,
          image_url: publicUrl,
          pose_score: alignmentFeedback?.alignmentScore || 0,
          pose_metadata: poseMetadata
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      // Add to captured scans
      const newScan: CapturedScan = {
        type: scanType,
        imageUrl: publicUrl,
        poseScore: alignmentFeedback?.alignmentScore || 0,
        poseMetadata
      };
      
      setCapturedScans(prev => [...prev, newScan]);
      
      // Trigger notifications
      await triggerScanCompletedNotification(scanType);
      await showInstantFeedback(scanType);
      
      toast({
        title: `${scanViewNames[scanType]} Captured! ✅`,
        description: `Your ${scanType} body scan has been saved.`,
      });

      // Move to next view or show completion
      if (scanType === 'front') {
        setCurrentView('side');
      } else if (scanType === 'side') {
        setCurrentView('back');
      } else if (scanType === 'back') {
        // All 3 scans complete - show completion modal
        setShowCompletionModal(true);
      }

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

  const handleCompletionSubmit = async () => {
    if (!weight) {
      toast({
        title: "Weight Required",
        description: "Please enter your current weight to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingCompletion(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      // Get scan index for this year
      const { data: scanIndexData } = await supabase
        .rpc('calculate_scan_index', { 
          p_user_id: user.id, 
          p_year: currentYear 
        });
      
      const scanIndex = scanIndexData || 1;
      
      // Update the body_scans records with complete scan data
      const frontScan = capturedScans.find(s => s.type === 'front');
      const sideScan = capturedScans.find(s => s.type === 'side');
      const backScan = capturedScans.find(s => s.type === 'back');
      
      // Get the most recent body scan record (should be the back scan)
      const { data: recentScan } = await supabase
        .from('body_scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (recentScan) {
        // Update the most recent scan with all 3 images and timeline data
        const { error: updateError } = await supabase
          .from('body_scans')
          .update({
            image_url: frontScan?.imageUrl, // Keep front as primary
            side_image_url: sideScan?.imageUrl,
            back_image_url: backScan?.imageUrl,
            weight: parseFloat(weight),
            scan_index: scanIndex,
            year: currentYear,
            month: currentMonth,
            pose_metadata: {
              ...(typeof recentScan.pose_metadata === 'object' && recentScan.pose_metadata !== null 
                ? recentScan.pose_metadata as Record<string, any> 
                : {}),
              weight: parseFloat(weight),
              weightUnit: weightUnit,
              completedScanTypes: ['front', 'side', 'back'],
              isGuidedScan: true
            }
          })
          .eq('id', recentScan.id);

        if (updateError) {
          throw updateError;
        }
      }

      // Update body scan reminders
      const { error: reminderError } = await supabase
        .rpc('update_body_scan_reminder', { 
          p_user_id: user.id,
          p_scan_date: new Date().toISOString()
        });

      if (reminderError) {
        console.error('Error updating reminder:', reminderError);
        // Don't fail the whole operation for reminder errors
      }

      setShowCompletionModal(false);
      
      // Show success and navigate back
      toast({
        title: "🎉 Body Scan Complete!",
        description: "✅ Scan saved! You'll be reminded to scan again in 30 days.",
      });
      
      setTimeout(() => {
        navigate('/exercise-hub');
      }, 2000);

    } catch (error) {
      console.error('Error completing body scan:', error);
      toast({
        title: "Completion Error",
        description: "Failed to complete body scan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  // Pose analysis for different views
  const analyzePoseAlignment = useCallback((pose: DetectedPose, view: ScanView): AlignmentFeedback => {
    const alignmentThreshold = 0.15;
    const misalignedLimbs: string[] = [];
    let feedback = "";
    
    const keypoints = pose.keypoints;
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
    const leftHip = keypoints.find(kp => kp.name === 'left_hip');
    const rightHip = keypoints.find(kp => kp.name === 'right_hip');
    const leftWrist = keypoints.find(kp => kp.name === 'left_wrist');
    const rightWrist = keypoints.find(kp => kp.name === 'right_wrist');
    
    if (view === 'front' || view === 'back') {
      // Front/back view analysis - check symmetry
      if (leftShoulder && rightShoulder) {
        const shoulderHeightDiff = Math.abs(leftShoulder.y - rightShoulder.y) / 
          Math.max(leftShoulder.y, rightShoulder.y);
        if (shoulderHeightDiff > alignmentThreshold) {
          misalignedLimbs.push('shoulders');
          feedback = "Keep shoulders level";
        }
      }
      
      if (leftHip && rightHip) {
        const hipHeightDiff = Math.abs(leftHip.y - rightHip.y) / 
          Math.max(leftHip.y, rightHip.y);
        if (hipHeightDiff > alignmentThreshold) {
          misalignedLimbs.push('hips');
          feedback = "Keep hips level";
        }
      }
    } else if (view === 'side') {
      // Side view analysis - check profile position
      const leftShoulderScore = leftShoulder?.score || 0;
      const rightShoulderScore = rightShoulder?.score || 0;
      const shoulderScoreDiff = Math.abs(leftShoulderScore - rightShoulderScore);
      
      if (shoulderScoreDiff < 0.3) {
        misalignedLimbs.push('profile');
        feedback = "Turn to your side (profile view)";
      }
    }
    
    // Check arm position for all views
    if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
      const leftArmDown = leftWrist.y > leftShoulder.y;
      const rightArmDown = rightWrist.y > rightShoulder.y;
      
      if (!leftArmDown || !rightArmDown) {
        misalignedLimbs.push('arms_position');
        feedback = "Lower your arms to your sides";
      }
    }
    
    const isAligned = misalignedLimbs.length === 0;
    const alignmentScore = isAligned ? 0.9 : Math.max(0.3, 0.9 - misalignedLimbs.length * 0.2);
    
    if (isAligned) {
      feedback = "Perfect alignment! Hold steady...";
    }
    
    return {
      isAligned,
      misalignedLimbs,
      alignmentScore,
      feedback
    };
  }, []);

  const drawPoseOverlay = useCallback((pose: DetectedPose, alignment: AlignmentFeedback) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set styles
    ctx.strokeStyle = alignment.isAligned ? '#10b981' : '#ef4444';
    ctx.fillStyle = alignment.isAligned ? '#10b981' : '#ef4444';
    ctx.lineWidth = 3;

    // Draw keypoints
    pose.keypoints.forEach(keypoint => {
      if (keypoint.score > 0.3) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Draw skeleton connections
    const connections = [
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'],
      ['right_shoulder', 'right_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'],
      ['right_hip', 'right_knee'],
      ['left_knee', 'left_ankle'],
      ['right_knee', 'right_ankle']
    ];

    connections.forEach(([pointA, pointB]) => {
      const keypointA = pose.keypoints.find(kp => kp.name === pointA);
      const keypointB = pose.keypoints.find(kp => kp.name === pointB);
      
      if (keypointA && keypointB && keypointA.score > 0.3 && keypointB.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(keypointA.x, keypointA.y);
        ctx.lineTo(keypointB.x, keypointB.y);
        ctx.stroke();
      }
    });
  }, []);

  const handleCancel = () => {
    navigate('/exercise-hub');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    if (validation.warning) {
      toast({
        title: "Large File",
        description: validation.warning,
      });
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      if (result) {
        await saveBodyScanToSupabase(result, currentView);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCameraToggle = () => {
    setCameraMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
          
          <div className="flex-1 mx-4">
            <div className="text-center text-white">
              <h1 className="text-lg font-bold">{scanViewNames[currentView]}</h1>
              <p className="text-sm opacity-80">{capturedScans.length + 1}/3</p>
            </div>
            <Progress value={progress} className="mt-2 h-2" />
          </div>
        </div>

        {/* Instruction */}
        <div className="mt-4 text-center">
          <p className="text-white text-sm font-medium">
            {scanInstructions[currentView]}
          </p>
        </div>
      </div>

      {/* Camera View */}
      <div className="relative w-full h-screen">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Pose overlay */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ mixBlendMode: 'multiply' }}
        />

        {/* Body outline guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-96 border-2 border-white/40 rounded-full opacity-60 animate-pulse" />
        </div>

        {/* Alignment feedback */}
        {alignmentFeedback && (
          <div className="absolute bottom-32 left-0 right-0 px-4">
            <div className={`text-center p-3 rounded-lg ${
              alignmentFeedback.isAligned 
                ? 'bg-green-500/80 text-white' 
                : 'bg-red-500/80 text-white'
            }`}>
              <p className="font-medium">{alignmentFeedback.feedback}</p>
              {alignmentFeedback.isAligned && (
                <p className="text-sm mt-1">
                  {validPoseTimer >= 2000 ? 'Capturing...' : `Hold steady... ${Math.ceil((2000 - validPoseTimer) / 1000)}s`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Countdown */}
        {isCountingDown && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/80 text-white text-8xl font-bold w-32 h-32 rounded-full flex items-center justify-center animate-pulse">
              {countdownSeconds}
            </div>
          </div>
        )}

        {/* Loading states */}
        {(isSaving || isCapturing) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg font-medium">
                {isSaving ? 'Saving scan...' : 'Capturing...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center space-x-4">
          {/* File upload */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Upload className="h-5 w-5" />
          </Button>

          {/* Manual capture */}
          <Button
            onClick={captureImage}
            disabled={isCapturing || isSaving}
            className="bg-white text-black hover:bg-white/90 px-8 py-3 text-lg font-medium"
          >
            {isCapturing ? 'Capturing...' : 'Capture'}
          </Button>

          {/* Camera toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleCameraToggle}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Orientation warning */}
      {showOrientationWarning && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="text-center text-white p-8">
            <h2 className="text-2xl font-bold mb-4">Please Rotate Your Device</h2>
            <p className="text-lg">For the best experience, please use portrait mode</p>
          </div>
        </div>
      )}

      {/* Hidden elements */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Tips Modal */}
      <ScanTipsModal 
        isOpen={tipsModal.isOpen} 
        onClose={tipsModal.onClose} 
      />

      {/* Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">🎉 Body Scan Complete!</DialogTitle>
            <DialogDescription className="text-center">
              We've saved your front, side, and back body scans. Our AI will now analyze your posture and muscle symmetry to help you improve performance and reduce injury risk.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Current weight ({weightUnit})</Label>
              <div className="flex space-x-2">
                <Input
                  id="weight"
                  type="number"
                  placeholder="Enter weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => setWeightUnit(weightUnit === 'lbs' ? 'kg' : 'lbs')}
                  className="px-4"
                >
                  {weightUnit}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button 
              onClick={handleCompletionSubmit}
              disabled={isSubmittingCompletion}
              className="w-full"
            >
              {isSubmittingCompletion ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}