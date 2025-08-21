import { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Users, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface InfluencerGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  onInfluencerCreated?: () => void;
}

interface CreateInfluencerModalProps {
  open: boolean;
  onCreated: () => void;
  onCancel: () => void;
}

const CreateInfluencerModal = ({ open, onCreated, onCancel }: CreateInfluencerModalProps) => {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || user?.email?.split('@')[0] || '');

  const handleCreate = async () => {
    if (!user) return;
    
    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('influencers')
        .insert({
          user_id: user.id,
          name: displayName,
          bio: 'Welcome to my fitness journey! 💪',
          category: 'fitness',
          is_active: true
        });

      if (error) throw error;

      // Fire analytics event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'influencer.first_time_created_profile');
      }

      toast({
        title: "Welcome to the Influencer Program! 🎉",
        description: "Your influencer profile has been created successfully.",
      });

      onCreated();
    } catch (error) {
      console.error('Error creating influencer profile:', error);
      toast({
        title: "Error",
        description: "Failed to create influencer profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => !isCreating && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Create Influencer Profile
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your influencer name"
              disabled={isCreating}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleCreate} 
              disabled={!displayName.trim() || isCreating}
              className="flex-1"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Profile
            </Button>
            <Button 
              variant="outline" 
              onClick={onCancel}
              disabled={isCreating}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const InfluencerGuard = ({ children, fallback, onInfluencerCreated }: InfluencerGuardProps) => {
  const { user } = useAuth();
  const { isInfluencer, loading } = useUserRole();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Redirect to auth with return URL
    window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return null;
  }

  if (!isInfluencer) {
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center p-8">
            <Alert className="max-w-md">
              <Users className="h-4 w-4" />
              <AlertDescription className="space-y-4">
                <p>You need an influencer profile to access this area.</p>
                <Button 
                  onClick={() => setShowCreateModal(true)} 
                  className="w-full gap-2"
                >
                  <Star className="h-4 w-4" />
                  Create Influencer Profile
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        <CreateInfluencerModal
          open={showCreateModal}
          onCreated={() => {
            setShowCreateModal(false);
            onInfluencerCreated?.();
            // Reload to refresh role state
            window.location.reload();
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </>
    );
  }

  return <>{children}</>;
};