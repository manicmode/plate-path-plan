import React from 'react';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { InfluencerCard } from './InfluencerCard';
import type { InfluencerPreview } from './types';

interface InfluencerListProps {
  items: InfluencerPreview[];
  loading?: boolean;
  emptyHint?: string;
  onSelect?: (id: string) => void;
  onToggleFollow?: (id: string) => void;
}


function LoadingSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card/95 backdrop-blur-sm">
      <div className="p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-start space-x-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function InfluencerList({ 
  items, 
  loading, 
  emptyHint = "No influencers match your filters.",
  onSelect,
  onToggleFollow
}: InfluencerListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <LoadingSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-6">
          <Users className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No influencers found</h3>
        <p className="text-muted-foreground max-w-sm">
          {emptyHint}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((influencer) => (
        <InfluencerCard 
          key={influencer.id} 
          data={influencer}
          onSelect={onSelect}
          onToggleFollow={onToggleFollow}
        />
      ))}
    </div>
  );
}