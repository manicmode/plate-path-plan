import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

const ADMIN_EMAILS = ['ashkan_e20000@yahoo.com'];

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = () => {
      if (!user?.email) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const userEmail = user.email.toLowerCase().trim();
      const isAdminUser = ADMIN_EMAILS.includes(userEmail);
      setIsAdmin(isAdminUser);
      setLoading(false);
    };

    checkAdmin();
  }, [user?.email]);

  return { isAdmin, loading };
}