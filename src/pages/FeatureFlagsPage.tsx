import FeatureFlagDemo from '@/components/FeatureFlagDemo';
import { AdminRoute } from '@/components/auth/AdminRoute';

export default function FeatureFlagsPage() {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Feature Flags System
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Manage and test feature flags with database-backed user overrides and global kill switches.
            </p>
          </div>
          <FeatureFlagDemo />
        </div>
      </div>
    </AdminRoute>
  );
}