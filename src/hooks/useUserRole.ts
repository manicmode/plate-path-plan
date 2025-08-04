import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export type UserRole = 'admin' | 'moderator' | 'user' | 'recovery_challenge_participant' | 'influencer' | null;

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .order('role', { ascending: true }) // admin first, then moderator, then user
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user role:', error);
          setRole('user'); // Default to user role
        } else {
          setRole(data?.role || 'user');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user?.id]);

  return {
    role,
    loading,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator' || role === 'admin',
    isUser: role === 'user' || role === 'moderator' || role === 'admin',
  };
};