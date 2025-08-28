// ========= PHASE 7: MINIMAL REPRO ROUTE - CAM PHOTO =========
// File input capture test (no getUserMedia) to prove red pill source

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { openPhotoCapture } from '@/components/camera/photoCapture';

// PHASE 8: External influence snapshot  
async function checkPermissionsAndContext() {
  try {
    const cam = await navigator.permissions.query({ name: 'camera' as any });
    const mic = await navigator.permissions.query({ name: 'microphone' as any });
    console.warn('[PERMS]', { 
      cam: cam?.state, 
      mic: mic?.state, 
      standalone: (navigator as any).standalone, 
      ua: navigator.userAgent.slice(0, 100) + '...',
      tethered: navigator.platform.includes('Mac') && /WebKit/.test(navigator.userAgent)
    });
  } catch (e) {
    console.warn('[PERMS][ERROR]', e);
  }
}

export default function CamPhoto() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  console.warn('[FLOW][enter] CamPhoto', location.pathname + location.search);

  const captureWithFileInput = () => {
    console.warn('[DEBUG][cam-photo] Using file input capture');
    checkPermissionsAndContext();
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment' as any;
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.warn('[DEBUG][cam-photo] File selected:', { 
          name: file.name, 
          size: file.size, 
          type: file.type 
        });
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageData = event.target?.result as string;
          setCapturedImage(imageData);
          setError(null);
        };
        reader.onerror = () => {
          setError('Failed to read file');
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  };

  const captureWithPhotoCapture = async () => {
    console.warn('[DEBUG][cam-photo] Using openPhotoCapture helper');
    checkPermissionsAndContext();
    
    try {
      setIsCapturing(true);
      setError(null);
      
      const file = await openPhotoCapture('image/*', 'environment');
      console.warn('[DEBUG][cam-photo] Photo captured via helper:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setCapturedImage(imageData);
      };
      reader.readAsDataURL(file);
      
    } catch (err: any) {
      console.warn('[DEBUG][cam-photo] Error:', err);
      setError(err.message || 'Capture failed');
    } finally {
      setIsCapturing(false);
    }
  };

  const clearImage = () => {
    setCapturedImage(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">📷 Camera Debug - Photo Only</h1>
        
        <div className="bg-gray-900 p-4 rounded-lg mb-4">
          <h2 className="text-lg font-semibold mb-2">Purpose</h2>
          <p className="text-sm text-gray-300">
            File input with capture="environment" test.
            No getUserMedia - should NOT trigger iOS red pill.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 p-4 rounded-lg mb-4">
            <h3 className="font-semibold">Error:</h3>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={captureWithFileInput}
              className="bg-blue-600 hover:bg-blue-700"
            >
              📁 File Input Capture
            </Button>
            <Button 
              onClick={captureWithPhotoCapture}
              disabled={isCapturing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isCapturing ? '📸 Capturing...' : '📸 Photo Helper'}
            </Button>
            <Button 
              onClick={checkPermissionsAndContext}
              className="bg-gray-600 hover:bg-gray-700"
            >
              🔍 Check Permissions  
            </Button>
            {capturedImage && (
              <Button 
                onClick={clearImage}
                className="bg-red-600 hover:bg-red-700"
              >
                🗑️ Clear Image
              </Button>
            )}
          </div>

          {capturedImage && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-green-400">✅ Image Captured</h3>
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full max-w-md mx-auto rounded border-2 border-green-500"
              />
            </div>
          )}
        </div>

        <div className="mt-6 bg-gray-900 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">🔍 Test Instructions</h3>
          <ol className="text-sm text-gray-300 space-y-1">
            <li>1. Open browser dev tools console</li>
            <li>2. Click either capture button</li>
            <li>3. Take a photo when camera opens</li>
            <li>4. Watch for red recording pill (should NOT appear)</li>
            <li>5. Check console logs for capture activity</li>
          </ol>
        </div>

        <div className="mt-4 bg-green-900/30 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">📝 Expected Results</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• <strong>Native Camera:</strong> Opens iOS camera app</li>
            <li>• <strong>No Red Pill:</strong> Only green dot briefly during capture</li>
            <li>• <strong>Photo Return:</strong> Image displays successfully</li>
            <li>• <strong>Console:</strong> No [INTCPT][GUM] logs (no getUserMedia)</li>
          </ul>
        </div>

        <div className="mt-4 bg-yellow-900/30 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">🎯 Comparison</h3>
          <p className="text-sm text-gray-300">
            Compare this page (photo only) with /debug/cam-pure (live video).
            If red pill only appears on cam-pure, it confirms getUserMedia as the source.
          </p>
        </div>
      </div>
    </div>
  );
}