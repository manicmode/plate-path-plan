
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Upload, ArrowRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { validateImageFile, getImageDimensions } from '@/utils/imageValidation';
import { useToast } from '@/hooks/use-toast';

// TODO: Future pose detection imports
// import * as poseDetection from '@tensorflow-models/pose-detection';
// import '@tensorflow/tfjs-backend-webgl';
// import { MediaPipeHands } from '@mediapipe/hands';
// import { Camera } from '@mediapipe/camera_utils';

// TODO: Future pose detection types
// interface PoseKeypoint {
//   x: number;
//   y: number;
//   confidence: number;
// }
// 
// interface DetectedPose {
//   keypoints: PoseKeypoint[];
//   score: number;
// }
//
// interface AlignmentFeedback {
//   isAligned: boolean;
//   misalignedLimbs: string[];
//   alignmentScore: number;
// }

export default function BodyScanAI() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // TODO: Future pose detection refs
  // const poseDetectorRef = useRef<poseDetection.PoseDetector | null>(null);
  // const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasImageReady, setHasImageReady] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>('environment');
  const [showOrientationWarning, setShowOrientationWarning] = useState(false);
  
  // TODO: Future pose detection state
  // const [poseDetected, setPoseDetected] = useState<DetectedPose | null>(null);
  // const [alignmentFeedback, setAlignmentFeedback] = useState<AlignmentFeedback | null>(null);
  // const [isPoseDetectionEnabled, setIsPoseDetectionEnabled] = useState(true);
  // const [poseDetectionReady, setPoseDetectionReady] = useState(false);

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

  // TODO: Future pose detection initialization
  useEffect(() => {
    // const initializePoseDetection = async () => {
    //   try {
    //     // Initialize TensorFlow.js pose detection
    //     await tf.ready();
    //     const detector = await poseDetection.createDetector(
    //       poseDetection.SupportedModels.MoveNet,
    //       {
    //         modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    //         enableSmoothing: true,
    //       }
    //     );
    //     poseDetectorRef.current = detector;
    //     setPoseDetectionReady(true);
    //     console.log('Pose detection initialized');
    //   } catch (error) {
    //     console.error('Failed to initialize pose detection:', error);
    //   }
    // };
    //
    // initializePoseDetection();
    //
    // return () => {
    //   if (poseDetectorRef.current) {
    //     poseDetectorRef.current.dispose();
    //   }
    // };
  }, []);

  // TODO: Future real-time pose detection loop
  useEffect(() => {
    // let animationFrame: number;
    //
    // const detectPoseRealTime = async () => {
    //   if (!videoRef.current || !poseDetectorRef.current || !isPoseDetectionEnabled) {
    //     animationFrame = requestAnimationFrame(detectPoseRealTime);
    //     return;
    //   }
    //
    //   try {
    //     const poses = await poseDetectorRef.current.estimatePoses(videoRef.current);
    //     
    //     if (poses.length > 0) {
    //       const pose = poses[0];
    //       setPoseDetected(pose);
    //       
    //       // Analyze alignment with body outline
    //       const alignment = analyzePoseAlignment(pose);
    //       setAlignmentFeedback(alignment);
    //       
    //       // Draw pose overlay
    //       drawPoseOverlay(pose, alignment);
    //     }
    //   } catch (error) {
    //     console.error('Pose detection error:', error);
    //   }
    //
    //   animationFrame = requestAnimationFrame(detectPoseRealTime);
    // };
    //
    // if (stream && poseDetectionReady) {
    //   detectPoseRealTime();
    // }
    //
    // return () => {
    //   if (animationFrame) {
    //     cancelAnimationFrame(animationFrame);
    //   }
    // };
  }, [stream, /* poseDetectionReady, isPoseDetectionEnabled */]);

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
    
    setIsCapturing(true);
    
    // TODO: Future pose validation before capture
    // if (isPoseDetectionEnabled && alignmentFeedback) {
    //   if (alignmentFeedback.alignmentScore < 0.8) {
    //     toast({
    //       title: "Pose Alignment Issue",
    //       description: `Please adjust: ${alignmentFeedback.misalignedLimbs.join(', ')}`,
    //       variant: "destructive"
    //     });
    //     setIsCapturing(false);
    //     return;
    //   }
    // }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    setHasImageReady(true);
    setIsCapturing(false);
    
    toast({
      title: "Photo Captured!",
      description: "Front body scan complete. Ready to continue to side scan.",
    });
  };

  // TODO: Future pose analysis functions
  // const analyzePoseAlignment = (pose: DetectedPose): AlignmentFeedback => {
  //   const alignmentThreshold = 0.1; // 10% tolerance
  //   const misalignedLimbs: string[] = [];
  //   
  //   // Check key pose landmarks against ideal body outline positions
  //   const keypoints = pose.keypoints;
  //   
  //   // Analyze shoulder alignment (should be horizontal)
  //   const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
  //   const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
  //   
  //   if (leftShoulder && rightShoulder) {
  //     const shoulderAngle = Math.abs(leftShoulder.y - rightShoulder.y) / Math.abs(leftShoulder.x - rightShoulder.x);
  //     if (shoulderAngle > alignmentThreshold) {
  //       misalignedLimbs.push('shoulders');
  //     }
  //   }
  //   
  //   // Analyze arm position (should be outstretched)
  //   const leftWrist = keypoints.find(kp => kp.name === 'left_wrist');
  //   const rightWrist = keypoints.find(kp => kp.name === 'right_wrist');
  //   
  //   if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
  //     // Check if arms are extended horizontally
  //     const leftArmExtended = Math.abs(leftWrist.y - leftShoulder.y) < alignmentThreshold;
  //     const rightArmExtended = Math.abs(rightWrist.y - rightShoulder.y) < alignmentThreshold;
  //     
  //     if (!leftArmExtended) misalignedLimbs.push('left_arm');
  //     if (!rightArmExtended) misalignedLimbs.push('right_arm');
  //   }
  //   
  //   // Calculate overall alignment score
  //   const totalCheckpoints = 3; // shoulders, left_arm, right_arm
  //   const alignmentScore = (totalCheckpoints - misalignedLimbs.length) / totalCheckpoints;
  //   
  //   return {
  //     isAligned: misalignedLimbs.length === 0,
  //     misalignedLimbs,
  //     alignmentScore
  //   };
  // };

  // const drawPoseOverlay = (pose: DetectedPose, alignment: AlignmentFeedback) => {
  //   if (!overlayCanvasRef.current || !videoRef.current) return;
  //   
  //   const canvas = overlayCanvasRef.current;
  //   const ctx = canvas.getContext('2d');
  //   if (!ctx) return;
  //   
  //   // Clear previous drawings
  //   ctx.clearRect(0, 0, canvas.width, canvas.height);
  //   
  //   // Draw pose keypoints with color coding
  //   pose.keypoints.forEach((keypoint) => {
  //     if (keypoint.confidence > 0.5) {
  //       const isAligned = !alignment.misalignedLimbs.some(limb => 
  //         keypoint.name?.includes(limb.replace('_', ' '))
  //       );
  //       
  //       ctx.beginPath();
  //       ctx.arc(keypoint.x, keypoint.y, 8, 0, 2 * Math.PI);
  //       ctx.fillStyle = isAligned ? '#00ff00' : '#ff0000'; // Green for aligned, red for misaligned
  //       ctx.fill();
  //       ctx.strokeStyle = '#ffffff';
  //       ctx.lineWidth = 2;
  //       ctx.stroke();
  //     }
  //   });
  //   
  //   // Draw skeleton connections
  //   const connections = [
  //     ['left_shoulder', 'right_shoulder'],
  //     ['left_shoulder', 'left_elbow'],
  //     ['left_elbow', 'left_wrist'],
  //     ['right_shoulder', 'right_elbow'],
  //     ['right_elbow', 'right_wrist'],
  //     // Add more connections as needed
  //   ];
  //   
  //   connections.forEach(([pointA, pointB]) => {
  //     const kpA = pose.keypoints.find(kp => kp.name === pointA);
  //     const kpB = pose.keypoints.find(kp => kp.name === pointB);
  //     
  //     if (kpA && kpB && kpA.confidence > 0.5 && kpB.confidence > 0.5) {
  //       ctx.beginPath();
  //       ctx.moveTo(kpA.x, kpA.y);
  //       ctx.lineTo(kpB.x, kpB.y);
  //       ctx.strokeStyle = '#00ffff';
  //       ctx.lineWidth = 3;
  //       ctx.stroke();
  //     }
  //   });
  // };

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
    if (hasImageReady && capturedImage) {
      sessionStorage.setItem('frontBodyScan', capturedImage);
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
          style={{ 
            transform: 'scaleX(-1)',
            WebkitTransform: 'scaleX(-1)'
          }}
        />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      
      {/* TODO: Future pose detection overlay canvas */}
      {/* <canvas 
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-25"
        style={{ 
          transform: cameraMode === 'user' ? 'scaleX(-1)' : 'none',
          WebkitTransform: cameraMode === 'user' ? 'scaleX(-1)' : 'none'
        }}
      /> */}
      
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
            className="w-[98vw] max-h-[85vh] h-auto opacity-90 object-contain animate-slow-pulse drop-shadow-[0_0_8px_rgba(0,255,255,0.8)] drop-shadow-[0_0_16px_rgba(0,255,255,0.6)] drop-shadow-[0_0_24px_rgba(0,255,255,0.4)]"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      </div>

      {/* Capture success overlay */}
      {hasImageReady && (
        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center z-16">
          <div className="bg-green-500/90 text-white px-6 py-3 rounded-full font-bold animate-fade-in">
            ✅ Front scan complete!
          </div>
        </div>
      )}

      {/* Camera Toggle Button - Above Cancel Button */}
      <div className="fixed bottom-44 right-6 z-30">
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
            disabled={isCapturing /* || (isPoseDetectionEnabled && alignmentFeedback && !alignmentFeedback.isAligned) */}
            className={`relative bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 
                     text-white font-bold py-4 text-lg border-2 border-green-400 
                     shadow-[0_0_20px_rgba(61,219,133,0.4)] hover:shadow-[0_0_30px_rgba(61,219,133,0.6)]
                     transition-all duration-300 disabled:opacity-50`}
          >
            <div className="flex items-center justify-center">
              {hasImageReady ? (
                <>
                  <ArrowRight className="w-6 h-6 mr-3" />
                  🚀 Continue to Side Scan
                </>
              ) : (
                <>
                  <div className={`w-6 h-6 mr-3 ${isCapturing ? 'animate-spin' : 'animate-pulse'}`}>⚡</div>
                  {isCapturing ? '🔍 SCANNING...' : '📸 Capture Front View'}
                  {/* TODO: Add pose alignment indicator */}
                  {/* {isPoseDetectionEnabled && alignmentFeedback && (
                    <span className="ml-2">
                      {alignmentFeedback.isAligned ? '✅' : '⚠️'}
                    </span>
                  )} */}
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

      {/* TODO: Future alignment feedback overlay */}
      {/* {alignmentFeedback && !alignmentFeedback.isAligned && (
        <div className="absolute top-1/2 left-4 right-4 z-25 transform -translate-y-1/2">
          <div className="bg-red-500/90 backdrop-blur-sm rounded-2xl p-4 border border-red-400">
            <h3 className="text-white font-bold mb-2">⚠️ Pose Alignment</h3>
            <p className="text-white text-sm mb-2">
              Alignment Score: {Math.round(alignmentFeedback.alignmentScore * 100)}%
            </p>
            <div className="space-y-1">
              {alignmentFeedback.misalignedLimbs.map((limb) => (
                <div key={limb} className="text-white text-xs bg-red-400/50 rounded px-2 py-1">
                  Adjust {limb.replace('_', ' ')}
                </div>
              ))}
            </div>
          </div>
        </div>
      )} */}

      {/* TODO: Future pose detection status indicator */}
      {/* {isPoseDetectionEnabled && (
        <div className="absolute top-20 right-6 z-25">
          <div className={`w-3 h-3 rounded-full ${
            poseDetectionReady ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
          }`}></div>
        </div>
      )} */}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      </div>
    </div>
  );
}
