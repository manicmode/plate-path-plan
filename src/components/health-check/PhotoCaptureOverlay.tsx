import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PhotoCaptureOverlayProps {
  isVisible: boolean;
  onHide?: () => void;
}

export const PhotoCaptureOverlay: React.FC<PhotoCaptureOverlayProps> = ({
  isVisible,
  onHide
}) => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldShow(true);
      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        setShouldShow(false);
        onHide?.();
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setShouldShow(false);
    }
  }, [isVisible, onHide]);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="absolute top-4 left-4 right-4 z-50"
        >
          <div className="bg-blue-600/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <p className="text-sm font-medium">
                📸 Aim at the <strong>Ingredients</strong> or <strong>Nutrition Facts</strong> panel
              </p>
            </div>
            <p className="text-xs text-blue-100 mt-1">
              Fill the frame • Avoid glare • Keep steady
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};