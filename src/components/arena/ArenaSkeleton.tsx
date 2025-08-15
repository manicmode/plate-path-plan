import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ArenaSkeleton() {
  return (
    <div className="rounded-2xl bg-card border p-4 md:p-6 min-h-[420px]">
      {/* Header section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-5 w-28" />
      </div>
      
      {/* Billboard button area */}
      <div className="mt-6 mb-6">
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      
      {/* Leaderboard entries */}
      <div className="space-y-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl bg-card border p-4">
            <div className="flex items-center gap-3">
              {/* Rank badge */}
              <Skeleton className="h-8 w-8 rounded-full" />
              
              {/* Avatar */}
              <Skeleton className="h-10 w-10 rounded-full" />
              
              {/* User info */}
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              
              {/* Points */}
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}