import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera as CameraIcon, Upload, RefreshCw, Edit3 } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';

export default function CameraPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nutrition context
  const { addFood } = useNutrition();

  // Effect to handle reset from navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('reset') === 'true') {
      navigate('/camera', { replace: true });
    }
  }, [location.search, navigate]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setSelectedImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const handleTakePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const resetState = () => {
    setSelectedImage('');
    setShowError(false);
    setErrorMessage('');
    setIsAnalyzing(false);
  };

  const handleRetryPhoto = () => {
    resetState();
    handleTakePhoto();
  };

  return (
    <div className="space-y-6 animate-fade-in p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 mt-8">Log Your Food</h1>
        <p className="text-gray-600 dark:text-gray-400">Take a photo or upload an image of your food</p>
      </div>

      {/* Error Display */}
      {showError && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="text-red-600 dark:text-red-400 mt-1">⚠️</div>
              <div className="flex-1">
                <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
                <p className="text-red-700 dark:text-red-300 text-sm mt-1">{errorMessage}</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetryPhoto}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <CameraIcon className="w-4 h-4 mr-1" />
                    Take New Photo
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera Section */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            {selectedImage ? (
              <div className="space-y-4">
                <img 
                  src={selectedImage} 
                  alt="Selected food" 
                  className="max-w-full h-64 object-cover rounded-lg mx-auto"
                />
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleTakePhoto} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retake Photo
                  </Button>
                  <Button 
                    onClick={() => navigate('/scan')}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Continue to Analysis
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-32 h-32 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <CameraIcon className="w-16 h-16 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Capture Your Food</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Take a clear photo of your meal for best results
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleTakePhoto} size="lg">
                    <CameraIcon className="w-5 h-5 mr-2" />
                    Take Photo
                  </Button>
                  <Button onClick={handleTakePhoto} variant="outline" size="lg">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Image
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate('/scan')}
          className="p-4 h-auto"
        >
          <div className="text-center">
            <CameraIcon className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-medium">Health Scan</div>
            <div className="text-xs text-gray-500">Analyze meals</div>
          </div>
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setShowError(true)}
          className="p-4 h-auto"
        >
          <div className="text-center">
            <Edit3 className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-medium">Manual Entry</div>
            <div className="text-xs text-gray-500">Type food details</div>
          </div>
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
}