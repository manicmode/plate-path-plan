
import { useAuth } from '@/contexts/AuthContext';
import AuthForm from '@/components/auth/AuthForm';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  console.log('Index component rendering, isAuthenticated:', isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      console.log('User authenticated, redirecting to /home');
      navigate('/home');
    }
  }, [isAuthenticated, navigate]);

  // Not authenticated - show auth form
  if (!isAuthenticated) {
    console.log('User not authenticated, showing AuthForm');
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <AuthForm />
      </div>
    );
  }

  // Authenticated - redirect to home (handled by useEffect)
  return null;
};

export default Index;
