import React, { createContext, useContext, useState } from 'react';

interface PreparingOverlayContextType {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
}

const PreparingOverlayContext = createContext<PreparingOverlayContextType | undefined>(undefined);

export const PreparingOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  return (
    <PreparingOverlayContext.Provider value={{ isVisible, show, hide }}>
      {children}
    </PreparingOverlayContext.Provider>
  );
};

export const usePreparingOverlay = () => {
  const context = useContext(PreparingOverlayContext);
  if (!context) {
    throw new Error('usePreparingOverlay must be used within a PreparingOverlayProvider');
  }
  return context;
};