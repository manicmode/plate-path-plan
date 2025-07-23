import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

interface PoseQualityData {
  poseScore: number;
  poseMetadata?: {
    shouldersLevel?: boolean;
    armsRaised?: boolean;
    alignmentScore?: number;
    misalignedLimbs?: string[];
  };
}

export const useBodyScanNotifications = () => {
  const [showTipsModal, setShowTipsModal] = useState(false);
  const triggerScanCompletedNotification = async (scanType: 'front' | 'side' | 'back') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.functions.invoke('body-scan-notifications', {
        body: {
          type: 'scan_completed',
          user_id: user.id,
          scan_type: scanType
        }
      });

      if (error) {
        console.error('Error triggering scan notification:', error);
      }
    } catch (error) {
      console.error('Failed to trigger scan notification:', error);
    }
  };

  const checkForReminders = async () => {
    try {
      const { error } = await supabase.functions.invoke('body-scan-notifications', {
        body: {
          type: 'check_reminders'
        }
      });

      if (error) {
        console.error('Error checking for reminders:', error);
      }
    } catch (error) {
      console.error('Failed to check for reminders:', error);
    }
  };

  const showInstantFeedback = async (scanType: 'front' | 'side' | 'back') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get recent scans to provide instant feedback
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data: recentScans } = await supabase
        .from('body_scans')
        .select('type')
        .eq('user_id', user.id)
        .gte('created_at', twentyFourHoursAgo.toISOString());

      if (!recentScans) return;

      const scanTypes = [...new Set(recentScans.map(scan => scan.type))];
      const scanCount = scanTypes.length;

      if (scanCount === 3) {
        toast.success('🎉 Full body scan complete! Amazing work! 💪', {
          duration: 5000,
        });
      } else if (scanCount === 2) {
        const remaining = ['front', 'side', 'back'].find(type => !scanTypes.includes(type));
        toast.info(`📸 Great progress! Complete your ${remaining} scan to finish the set! 👀`, {
          duration: 4000,
        });
      } else if (scanCount === 1) {
        toast.info('🚀 Good start! Capture your other two angles for the complete picture! 📸', {
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Failed to show instant feedback:', error);
    }
  };

  const showPoseQualityFeedback = (qualityData: PoseQualityData, scanType: string) => {
    const { poseScore, poseMetadata } = qualityData;
    
    // Check for alignment issues
    const hasAlignmentIssues = poseMetadata && (
      !poseMetadata.shouldersLevel || 
      poseMetadata.misalignedLimbs?.length > 0 ||
      (poseMetadata.alignmentScore && poseMetadata.alignmentScore < 70)
    );

    if (poseScore >= 0.9 && !hasAlignmentIssues) {
      // Excellent pose
      toast.success('🌟 Perfect posture detected! This scan will be super helpful for tracking progress. Keep it up 💪', {
        duration: 6000,
      });
    } else if (poseScore < 0.7 || hasAlignmentIssues) {
      // Poor pose quality
      const issues = [];
      if (!poseMetadata?.shouldersLevel) issues.push('shoulders');
      if (poseMetadata?.misalignedLimbs?.includes('left_arm') || poseMetadata?.misalignedLimbs?.includes('right_arm')) issues.push('arms');
      if (poseMetadata?.misalignedLimbs?.includes('hips')) issues.push('hips');

      toast.error('📏 Your scan looks a bit misaligned. Try standing straight with arms relaxed next time! Need help? Tap for tips 🧠', {
        duration: 8000,
        action: {
          label: 'Learn to improve scans',
          onClick: () => setShowTipsModal(true)
        }
      });
    } else {
      // Good pose
      toast.success('✅ Good scan quality! Your progress tracking will be accurate 📈', {
        duration: 4000,
      });
    }
  };

  const getTipsModal = () => ({
    isOpen: showTipsModal,
    onClose: () => setShowTipsModal(false)
  });

  return {
    triggerScanCompletedNotification,
    checkForReminders,
    showInstantFeedback,
    showPoseQualityFeedback,
    getTipsModal
  };
};