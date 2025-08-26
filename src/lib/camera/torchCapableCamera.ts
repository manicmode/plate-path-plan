/**
 * Utility for selecting torch-capable cameras
 */

export interface CameraInfo {
  deviceId: string;
  label: string;
  kind: string;
  facingMode?: string;
}

export interface CameraStreamOptions {
  width?: { ideal: number };
  height?: { ideal: number };
  frameRate?: { ideal: number };
}

/**
 * Test if a camera device supports torch by requesting a stream and checking capabilities
 */
async function testTorchSupport(deviceId: string): Promise<boolean> {
  try {
    console.log('[TORCH-CAM] Testing torch support for device:', deviceId);
    
    const testStream = await navigator.mediaDevices.getUserMedia({
      video: { 
        deviceId: { exact: deviceId },
        facingMode: 'environment' // Prefer back cameras
      }
    });
    
    const track = testStream.getVideoTracks()[0];
    const capabilities = track.getCapabilities?.();
    const hasTorch = !!(capabilities && 'torch' in capabilities);
    
    console.log('[TORCH-CAM] Device capabilities:', { 
      deviceId: deviceId.slice(0, 8) + '...', 
      hasTorch,
      capabilities: capabilities ? Object.keys(capabilities) : 'none'
    });
    
    // Clean up test stream
    testStream.getTracks().forEach(track => track.stop());
    
    return hasTorch;
  } catch (error) {
    console.log('[TORCH-CAM] Failed to test device:', deviceId.slice(0, 8) + '...', error);
    return false;
  }
}

/**
 * Get list of available video input devices
 */
async function getVideoDevices(): Promise<CameraInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'videoinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label,
        kind: device.kind,
        facingMode: device.label.toLowerCase().includes('back') || 
                   device.label.toLowerCase().includes('rear') ? 'environment' : 'user'
      }));
  } catch (error) {
    console.error('[TORCH-CAM] Failed to enumerate devices:', error);
    return [];
  }
}

/**
 * Get the best camera that supports torch, preferring back cameras
 */
export async function getTorchCapableCamera(): Promise<string | null> {
  console.log('[TORCH-CAM] Searching for torch-capable cameras...');
  
  try {
    // First, get permissions to access camera labels
    const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
    permissionStream.getTracks().forEach(track => track.stop());
    
    const devices = await getVideoDevices();
    console.log('[TORCH-CAM] Found video devices:', devices.map(d => ({ 
      id: d.deviceId.slice(0, 8) + '...', 
      label: d.label, 
      facingMode: d.facingMode 
    })));
    
    // Prioritize back cameras for torch testing
    const backCameras = devices.filter(d => d.facingMode === 'environment');
    const otherCameras = devices.filter(d => d.facingMode !== 'environment');
    const orderedDevices = [...backCameras, ...otherCameras];
    
    // Test cameras for torch support
    for (const device of orderedDevices) {
      const hasTorch = await testTorchSupport(device.deviceId);
      if (hasTorch) {
        console.log('[TORCH-CAM] Found torch-capable camera:', { 
          id: device.deviceId.slice(0, 8) + '...', 
          label: device.label 
        });
        return device.deviceId;
      }
    }
    
    console.log('[TORCH-CAM] No torch-capable cameras found');
    return null;
  } catch (error) {
    console.error('[TORCH-CAM] Error finding torch-capable camera:', error);
    return null;
  }
}

/**
 * Start camera with torch support preference
 */
export async function startTorchCapableCamera(
  options: CameraStreamOptions = {}
): Promise<MediaStream> {
  console.log('[TORCH-CAM] Starting torch-capable camera...');
  
  const defaultOptions = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
    ...options
  };
  
  try {
    // First, try to find a torch-capable camera
    const torchDeviceId = await getTorchCapableCamera();
    
    if (torchDeviceId) {
      console.log('[TORCH-CAM] Using torch-capable camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: torchDeviceId },
          facingMode: 'environment',
          ...defaultOptions
        },
        audio: false
      });
      
      // Verify torch support on the final stream
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      console.log('[TORCH-CAM] Final stream torch support:', !!(capabilities && 'torch' in capabilities));
      
      return stream;
    }
    
    // Fallback to regular camera selection
    console.log('[TORCH-CAM] Falling back to regular camera selection...');
    
    // Try high-quality back camera first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          ...defaultOptions
        },
        audio: false
      });
      
      console.log('[TORCH-CAM] Using fallback back camera');
      return stream;
    } catch (error) {
      console.log('[TORCH-CAM] High-quality fallback failed, trying basic...');
      
      // Final fallback to basic camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      
      console.log('[TORCH-CAM] Using basic fallback camera');
      return stream;
    }
  } catch (error) {
    console.error('[TORCH-CAM] All camera attempts failed:', error);
    throw error;
  }
}

/**
 * Upgrade current stream to torch-capable if possible
 */
export async function upgradeTorchCapableStream(
  currentStream: MediaStream,
  options: CameraStreamOptions = {}
): Promise<MediaStream> {
  console.log('[TORCH-CAM] Attempting to upgrade to torch-capable stream...');
  
  // Check if current stream already supports torch
  const currentTrack = currentStream.getVideoTracks()[0];
  const currentCapabilities = currentTrack.getCapabilities?.();
  
  if (currentCapabilities && 'torch' in currentCapabilities) {
    console.log('[TORCH-CAM] Current stream already supports torch');
    return currentStream;
  }
  
  console.log('[TORCH-CAM] Current stream does not support torch, upgrading...');
  
  try {
    // Stop current stream
    currentStream.getTracks().forEach(track => track.stop());
    
    // Get new torch-capable stream
    const newStream = await startTorchCapableCamera(options);
    console.log('[TORCH-CAM] Successfully upgraded to torch-capable stream');
    
    return newStream;
  } catch (error) {
    console.error('[TORCH-CAM] Failed to upgrade stream:', error);
    // If upgrade fails, try to restart the original stream
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      console.log('[TORCH-CAM] Restored fallback stream after upgrade failure');
      return fallbackStream;
    } catch (restoreError) {
      console.error('[TORCH-CAM] Failed to restore stream after upgrade failure:', restoreError);
      throw error; // Throw original upgrade error
    }
  }
}