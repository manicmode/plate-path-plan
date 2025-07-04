
import { FirebaseSetupVerifier } from '@/components/FirebaseSetupVerifier';

const FirebaseSetup = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Firebase Push Notification Setup
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Verify and test your Firebase Cloud Messaging integration
          </p>
        </div>
        <FirebaseSetupVerifier />
      </div>
    </div>
  );
};

export default FirebaseSetup;
