import React from 'react';
import { CheckCircle2, Users, Calendar, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { InfluencerPreview } from './types';

interface InfluencerListProps {
  items: InfluencerPreview[];
  loading?: boolean;
  emptyHint?: string;
}

// Utility functions
const formatFollowers = (count?: number): string => {
  if (!count) return '0';
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
};

const formatRelative = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Past';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`;
  return `${Math.ceil(diffDays / 30)} months`;
};

function InfluencerCard({ influencer }: { influencer: InfluencerPreview }) {
  const nextChallengeText = formatRelative(influencer.nextChallengeStart);

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
      "hover:-translate-y-1 hover:shadow-primary/10 bg-card/95 backdrop-blur-sm",
      "border-border/50 hover:border-primary/20"
    )}>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          {/* Header with Avatar and Basic Info */}
          <div className="flex items-start space-x-4">
            <div className="relative">
              <img
                src={influencer.avatarUrl}
                alt={`${influencer.name} avatar`}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-border/50 group-hover:ring-primary/30 transition-all"
              />
              {influencer.verified && (
                <CheckCircle2 className="absolute -bottom-1 -right-1 h-5 w-5 text-primary bg-background rounded-full p-0.5" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {influencer.name}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">@{influencer.handle}</p>
              
              {influencer.tagline && (
                <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                  {influencer.tagline}
                </p>
              )}
            </div>
          </div>

          {/* Niches */}
          {influencer.niches && influencer.niches.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {influencer.niches.slice(0, 3).map((niche) => (
                <Badge key={niche} variant="secondary" className="text-xs px-2 py-0.5">
                  {niche}
                </Badge>
              ))}
              {influencer.niches.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{influencer.niches.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              {influencer.followerCount && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{formatFollowers(influencer.followerCount)}</span>
                </div>
              )}
              
              {nextChallengeText && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">Next: {nextChallengeText}</span>
                </div>
              )}
            </div>

            {/* Follow Button */}
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "flex items-center gap-1.5 transition-all group-hover:border-primary/30",
                "hover:bg-primary hover:text-primary-foreground"
              )}
              onClick={() => {
                // TODO: Implement follow functionality
                console.log('Follow clicked for:', influencer.id);
              }}
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Follow</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
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
      </CardContent>
    </Card>
  );
}

export function InfluencerList({ items, loading, emptyHint = "No influencers match your filters." }: InfluencerListProps) {
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
        <InfluencerCard key={influencer.id} influencer={influencer} />
      ))}
    </div>
  );
}