
import { useAuth } from '@/contexts/AuthContext';
import AuthForm from '@/components/auth/AuthForm';
import Layout from '@/components/Layout';
import Home from './Home';

const Index = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return (
    <Layout>
      <Home />
    </Layout>
  );
};

export default Index;
