import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReviewItemsScreen } from '@/components/camera/ReviewItemsScreen';

export default function ReviewItemsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as { items?: any[]; origin?: string };

  if (!state.items?.length) {
    // Hard guard: if someone hits the URL directly, bounce safely
    navigate('/scan', { replace: true });
    return null;
  }

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
      />
    </div>
  );
}