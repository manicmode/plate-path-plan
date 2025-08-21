import { useState, useCallback, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from '@/hooks/use-toast';
import { validateImageFile, getImageDimensions } from '@/utils/imageValidation';

interface AvatarUploadProps {
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  onDelete?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16', 
  lg: 'h-24 w-24'
};

export function AvatarUpload({ 
  currentUrl, 
  onUpload, 
  onDelete, 
  className,
  size = 'md' 
}: AvatarUploadProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload an avatar.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        toast({
          title: "Invalid file",
          description: validation.error,
          variant: "destructive"
        });
        return;
      }

      if (validation.warning) {
        toast({
          title: "Large file detected",
          description: validation.warning
        });
      }

      // Resize image if needed
      let processedFile = file;
      try {
        const dimensions = await getImageDimensions(file);
        if (dimensions.width > 512 || dimensions.height > 512) {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
          });

          // Calculate new dimensions (square crop)
          const size = Math.min(dimensions.width, dimensions.height);
          canvas.width = Math.min(size, 512);
          canvas.height = Math.min(size, 512);

          // Draw and crop to square
          const sx = (dimensions.width - size) / 2;
          const sy = (dimensions.height - size) / 2;
          
          ctx?.drawImage(img, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
          
          // Convert back to blob
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
          });
          
          processedFile = new File([blob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
          URL.revokeObjectURL(img.src);
        }
      } catch (error) {
        console.warn('Could not resize image, using original:', error);
      }

      // Upload to Supabase Storage
      const fileName = `avatar_${Date.now()}.${processedFile.name.split('.').pop()}`;
      const filePath = `${user.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      onUpload(publicUrl);

      toast({
        title: "Avatar uploaded",
        description: "Your profile photo has been updated."
      });

    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      uploadFile(imageFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, WebP).",
        variant: "destructive"
      });
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDelete = async () => {
    if (!currentUrl || !onDelete) return;

    try {
      // Extract file path from URL for deletion
      const url = new URL(currentUrl);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-2).join('/'); // user_id/filename

      await supabase.storage
        .from('avatars')
        .remove([filePath]);

      onDelete();

      toast({
        title: "Avatar deleted",
        description: "Your profile photo has been removed."
      });

    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: "Delete failed", 
        description: "Could not remove avatar. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "relative rounded-full overflow-hidden bg-muted border-2 border-dashed transition-colors",
          sizeClasses[size],
          isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/30",
          "hover:border-primary/50 hover:bg-muted/80 cursor-pointer group"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        {currentUrl ? (
          <>
            <img 
              src={currentUrl} 
              alt="Avatar" 
              className="h-full w-full object-cover"
            />
            {!isUploading && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-4 w-4 text-white" />
              </div>
            )}
          </>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Upload className="h-5 w-5 mb-1" />
                <span className="text-xs">Drop or click</span>
              </>
            )}
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex-1"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-3 w-3 mr-1" />
              {currentUrl ? 'Replace' : 'Upload'}
            </>
          )}
        </Button>

        {currentUrl && onDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isUploading}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG or WebP • Max 5MB • Auto-cropped to square
      </p>
    </div>
  );
}