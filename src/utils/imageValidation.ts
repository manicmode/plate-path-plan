
export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export const validateImageFile = (file: File): ImageValidationResult => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Please select a valid image file (JPEG, PNG, or WebP)'
    };
  }

  // Check file size (50MB max)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Image file is too large. Please select an image under 50MB.'
    };
  }

  // Warning for large files
  const warningSize = 10 * 1024 * 1024; // 10MB
  if (file.size > warningSize) {
    return {
      isValid: true,
      warning: 'Large image detected. Processing may take longer.'
    };
  }

  return { isValid: true };
};

export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};
