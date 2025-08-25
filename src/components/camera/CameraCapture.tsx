import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload } from 'lucide-react';
import { validateImageFile } from '@/utils/imageValidation';
import { toast } from 'sonner';

interface CameraCaptureProps {
  onImageSelected: (imageDataUrl: string) => void;
  disabled?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onImageSelected,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate the image file
      const validationResult = await validateImageFile(file);
      if (!validationResult.isValid) {
        toast.error(validationResult.error || 'Invalid image file');
        return;
      }

      // Convert to data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          onImageSelected(result);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image file:', error);
      toast.error('Failed to process image file');
    }

    // Reset the input
    event.target.value = '';
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Camera capture buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={handleCameraCapture}
          disabled={disabled}
          className="h-16 w-full gradient-primary flex items-center justify-center space-x-2"
          size="lg"
        >
          <Camera className="h-5 w-5" />
          <span>Camera</span>
        </Button>

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          variant="outline"
          className="h-16 w-full flex items-center justify-center space-x-2"
          size="lg"
        >
          <Upload className="h-5 w-5" />
          <span>Upload</span>
        </Button>
      </div>
    </div>
  );
};