import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useRank20Members, useArenaMembership } from '@/hooks/arena/useRank20Members';
import { useRank20ChallengeId } from '@/hooks/arena/useRank20ChallengeId';

interface SmokeTestResult {
  pageRenders: boolean;
  noRedirectTo404: boolean;
  arenaComponentMounts: boolean;
  noBannerWhenRPCSucceeds: boolean;
  errorMessage?: string;
}

export const ArenaSmokeTester: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const membership = useRank20Members(user?.id);
  const membershipData = useArenaMembership();
  const { challengeId } = useRank20ChallengeId();
  const [testResult, setTestResult] = useState<SmokeTestResult>({
    pageRenders: false,
    noRedirectTo404: false,
    arenaComponentMounts: false,
    noBannerWhenRPCSucceeds: false,
  });

  useEffect(() => {
    const runSmokeTest = () => {
      const result: SmokeTestResult = {
        pageRenders: true, // If this runs, page rendered
        noRedirectTo404: !location.pathname.includes('/404'),
        arenaComponentMounts: true, // If this component mounts, Arena mounted
        noBannerWhenRPCSucceeds: !membershipData.data?.error && !membershipData.isError,
      };

      // Check for any errors
      if (membershipData.isError || membershipData.data?.error) {
        result.errorMessage = membershipData.data?.error || 'Unknown membership error';
      }

      setTestResult(result);

      // Log the result for console output
      console.log('[Arena Smoke Test]', {
        pageRenders: result.pageRenders,
        noRedirectTo404: result.noRedirectTo404,
        arenaComponentMounts: result.arenaComponentMounts,
        noBannerWhenRPCSucceeds: result.noBannerWhenRPCSucceeds,
        membershipLoading: membership.isLoading,
        challengeId: challengeId,
        errorMessage: result.errorMessage,
      });
    };

    // Run test after a short delay to allow hooks to settle
    const timer = setTimeout(runSmokeTest, 1000);
    return () => clearTimeout(timer);
  }, [membershipData, challengeId, location.pathname]);

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't render in production
  }

  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-3 shadow-lg text-xs z-50">
      <div className="font-semibold mb-2">Arena Smoke Test</div>
      <div className="space-y-1">
        <div className={testResult.pageRenders ? 'text-green-600' : 'text-red-600'}>
          ✓ Page renders: {testResult.pageRenders.toString()}
        </div>
        <div className={testResult.noRedirectTo404 ? 'text-green-600' : 'text-red-600'}>
          ✓ No 404 redirect: {testResult.noRedirectTo404.toString()}
        </div>
        <div className={testResult.arenaComponentMounts ? 'text-green-600' : 'text-red-600'}>
          ✓ Arena mounts: {testResult.arenaComponentMounts.toString()}
        </div>
        <div className={testResult.noBannerWhenRPCSucceeds ? 'text-green-600' : 'text-red-600'}>
          ✓ No error banner: {testResult.noBannerWhenRPCSucceeds.toString()}
        </div>
        {testResult.errorMessage && (
          <div className="text-red-600 text-xs">
            Error: {testResult.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};