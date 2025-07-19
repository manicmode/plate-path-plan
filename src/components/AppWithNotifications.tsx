import React from 'react';
import { useFlaggedIngredientNotifications } from '@/hooks/useFlaggedIngredientNotifications';

export const AppWithNotifications: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize flagged ingredient notifications
  useFlaggedIngredientNotifications();
  
  return <>{children}</>;
};