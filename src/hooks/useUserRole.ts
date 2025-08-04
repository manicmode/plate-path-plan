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
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('user'); // Default to user role
        } else if (data && data.length > 0) {
          // Priority order: admin > influencer > moderator > user
          const roles = data.map(r => r.role);
          if (roles.includes('admin')) {
            setRole('admin');
          } else if (roles.includes('influencer')) {
            setRole('influencer');
          } else if (roles.includes('moderator')) {
            setRole('moderator');
          } else {
            setRole('user');
          }
        } else {
          setRole('user');
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
    isInfluencer: role === 'influencer' || role === 'admin', // Admins have influencer access too
  };
};