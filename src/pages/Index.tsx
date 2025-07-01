
import { useAuth } from '@/contexts/AuthContext';
import AuthForm from '@/components/auth/AuthForm';
import Layout from '@/components/Layout';
import Home from './Home';

const Index = () => {
  const { isAuthenticated } = useAuth();

  console.log('Index component rendering, isAuthenticated:', isAuthenticated);

  if (!isAuthenticated) {
    console.log('User not authenticated, showing AuthForm');
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <AuthForm />
      </div>
    );
  }

  console.log('User authenticated, showing Home');
  return (
    <Layout>
      <Home />
    </Layout>
  );
};

export default Index;
