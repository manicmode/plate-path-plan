import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReviewItemsScreen } from '@/components/camera/ReviewItemsScreen';
import { FoodConfirmModal } from '@/components/FoodConfirmModal';
import { toast } from 'sonner';

export default function ReviewItemsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as { items?: any[]; origin?: string };

  // State for existing FoodConfirmModal flow
  const [confirmFlowItems, setConfirmFlowItems] = React.useState<any[]>([]);
  const [confirmFlowOrigin, setConfirmFlowOrigin] = React.useState<string>('');
  const [confirmFlowActive, setConfirmFlowActive] = React.useState(false);

  if (!state.items?.length) {
    // Hard guard: if someone hits the URL directly, bounce safely
    navigate('/scan', { replace: true });
    return null;
  }

  // Existing confirm flow handlers
  const handleStartConfirmFlow = (items: any[], origin: string) => {
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[DL][FLOW] start', { count: items.length, origin });
    }
    setConfirmFlowItems(items);
    setConfirmFlowOrigin(origin);
    setConfirmFlowActive(true);
  };

  const handleConfirmFlowComplete = async (confirmedItems: any[]) => {
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[DL][FLOW] end', { confirmed: confirmedItems.length, origin: confirmFlowOrigin });
    }

    try {
      // Import here to avoid circular dependencies
      const { oneTapLog } = await import('@/lib/nutritionLog');
      
      const logEntries = confirmedItems.map(item => ({
        name: item.name,
        canonicalName: item.canonicalName || item.name,
        grams: item.portion_estimate || 100
      }));

      await oneTapLog(logEntries);
      
      toast.success(`Logged ${confirmedItems.length} item${confirmedItems.length > 1 ? 's' : ''} ✓`);
      
      // Navigate to home
      navigate('/home', { replace: true });
    } catch (error) {
      console.error('[DL][FLOW] log failed', error);
      toast.error('Failed to log items. Please try again.');
    } finally {
      // Reset confirm flow state
      setConfirmFlowActive(false);
      setConfirmFlowItems([]);
      setConfirmFlowOrigin('');
    }
  };

  const handleConfirmFlowReject = () => {
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[DL][FLOW] rejected', { origin: confirmFlowOrigin });
    }
    // Reset confirm flow state
    setConfirmFlowActive(false);
    setConfirmFlowItems([]);
    setConfirmFlowOrigin('');
  };

  // Add forensic breadcrumbs for existing modal actions
  React.useEffect(() => {
    if (confirmFlowActive && confirmFlowItems.length > 0 && import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[DL][FLOW] open', { index: 1, name: confirmFlowItems[0]?.name });
    }
  }, [confirmFlowActive, confirmFlowItems]);

  return (
    <div className="fixed inset-0 z-50">
      <ReviewItemsScreen
        isOpen={true}
        onClose={() => navigate('/scan', { replace: true })}
        onNext={() => {}} // Not used - logging handled within modal
        items={state.items}
        afterLogSuccess={() => {
          // After successful logging, navigate to home
          navigate('/home', { replace: true });
        }}
        onStartConfirmFlow={handleStartConfirmFlow}
      />

      {/* Existing FoodConfirmModal Flow */}
      <FoodConfirmModal
        isOpen={confirmFlowActive}
        items={confirmFlowItems}
        onConfirm={handleConfirmFlowComplete}
        onReject={handleConfirmFlowReject}
      />
    </div>
  );
}
