
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';

interface HomePreferences {
  showAIInsights: boolean;
  showTicker: boolean;
  showQuickActions: boolean;
}

export const useHomePreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<HomePreferences>({
    showAIInsights: true,
    showTicker: true,
    showQuickActions: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      // Load user preferences from localStorage or default values
      const savedPrefs = localStorage.getItem(`homePrefs_${user.id}`);
      if (savedPrefs) {
        try {
          const parsed = JSON.parse(savedPrefs);
          setPreferences(parsed);
        } catch (error) {
          console.error('Error parsing home preferences:', error);
        }
      }
    }
    setLoading(false);
  }, [user?.id]); // Fixed: removed preferences from dependency array

  const updatePreferences = (newPrefs: Partial<HomePreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    
    if (user?.id) {
      localStorage.setItem(`homePrefs_${user.id}`, JSON.stringify(updated));
    }
  };

  return {
    preferences,
    updatePreferences,
    loading
  };
};
