import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PlugZap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AddStepsQuickAction: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const onAddSteps = async () => {
    const input = window.prompt('Enter steps for today');
    if (!input) return;
    const steps = parseInt(input, 10);
    if (isNaN(steps) || steps < 0) {
      toast({ title: 'Invalid number', description: 'Please enter a valid non-negative number.', variant: 'destructive' });
      return;
    }
    if (!user?.id) {
      toast({ title: 'Not signed in', description: 'Please sign in first.', variant: 'destructive' });
      return;
    }
    try {
      setBusy(true);
      const today = new Date().toISOString().split('T')[0];
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { error } = await supabase
        .from('activity_steps')
        .upsert({ user_id: user.id, source: 'manual', date: today, steps, raw: { source: 'manual' }, local_tz: tz }, { onConflict: 'user_id,source,date' });
      if (error) throw error;
      toast({ title: 'Steps added', description: `${steps.toLocaleString()} steps logged for today.` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Please try again', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={onAddSteps} className="action-button-full text-xs px-3 py-2" disabled={busy}>
      <PlugZap className="h-3 w-3" />
      {busy ? 'Adding…' : 'Add Steps'}
    </button>
  );
};

export const ConnectAppsEmptyStateLink: React.FC = () => {
  return (
    <div className="mt-2 text-xs text-white/80">
      Connect an activity provider to see your steps.{' '}
      <Link to="/settings/connected-apps" className="underline">Connect Apps</Link>
    </div>
  );
};
