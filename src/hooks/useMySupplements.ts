import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { 
  listMySupplements, 
  addMySupplement, 
  removeMySupplement, 
  updateMySupplement,
  setCurrentUserId,
  type MySupp 
} from '@/lib/supplements/mySuppStore';

export const useMySupplements = () => {
  const { user } = useAuth();
  const [supplements, setSupplements] = useState<MySupp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Update current user ID in store
  useEffect(() => {
    setCurrentUserId(user?.id);
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    const loadSupplements = () => {
      try {
        const data = listMySupplements();
        setSupplements(data);
      } catch (error) {
        console.error('Failed to load my supplements:', error);
        setSupplements([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSupplements();
  }, [user?.id]);

  // Listen for changes
  useEffect(() => {
    const handleChange = () => {
      const data = listMySupplements();
      setSupplements(data);
    };

    window.addEventListener('mySupp.changed', handleChange);
    return () => window.removeEventListener('mySupp.changed', handleChange);
  }, []);

  return {
    supplements,
    isLoading,
    addSupplement: addMySupplement,
    removeSupplement: removeMySupplement,
    updateSupplement: updateMySupplement,
  };
};