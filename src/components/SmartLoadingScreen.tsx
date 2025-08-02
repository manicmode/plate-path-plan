import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

interface SmartLoadingScreenProps {
  children: React.ReactNode;
}

export const SmartLoadingScreen: React.FC<SmartLoadingScreenProps> = ({ children }) => {
  const { loading: authLoading, user, session } = useAuth();
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Wait for auth to settle and theme to be ready
    const checkReady = () => {
      // Ready when auth is no longer loading AND either:
      // - User is authenticated (has session) OR
      // - Auth explicitly resolved with no user (not authenticated)
      const authReady = !authLoading && (!!session || session === null);
      const themeReady = !!theme;
      
      return authReady && themeReady;
    };

    if (checkReady()) {
      setIsReady(true);
      // Add small delay to prevent flash and allow smooth transition
      setTimeout(() => {
        setShowContent(true);
      }, 150);
    }
  }, [authLoading, user, session, theme]);

  // Show loading screen until everything is ready
  if (!isReady) {
    return (
      <div className="absolute inset-0 z-50 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {showContent ? (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full h-full"
        >
          {children}
        </motion.div>
      ) : (
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute inset-0 z-50 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center"
        >
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};