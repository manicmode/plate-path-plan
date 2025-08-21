import React from 'react';
import { CheckCircle2, Users, Calendar, UserPlus, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { InfluencerPreview } from './types';

interface InfluencerCardProps {
  data: InfluencerPreview;
  onSelect?: (id: string) => void;
  onToggleFollow?: (id: string) => void;
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

export function InfluencerCard({ data, onSelect, onToggleFollow }: InfluencerCardProps) {
  const nextChallengeText = formatRelative(data.nextChallengeStart);

  const handleCardClick = () => {
    onSelect?.(data.id);
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onToggleFollow?.(data.id);
  };

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer",
        "hover:-translate-y-1 hover:shadow-primary/10 bg-card/95 backdrop-blur-sm",
        "border-border/50 hover:border-primary/20"
      )}
      onClick={handleCardClick}
    >
      {/* Banner if available */}
      {data.bannerUrl && (
        <div className="relative h-24 overflow-hidden">
          <img
            src={data.bannerUrl}
            alt={`${data.name} banner`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      <CardContent className={cn("p-6", data.bannerUrl && "-mt-8 relative z-10")}>
        <div className="flex flex-col space-y-4">
          {/* Header with Avatar and Basic Info */}
          <div className="flex items-start space-x-4">
            <div className="relative">
              {data.avatarUrl ? (
                <img
                  src={data.avatarUrl}
                  alt={`${data.name} avatar`}
                  className={cn(
                    "w-16 h-16 rounded-full object-cover ring-2 transition-all",
                    data.bannerUrl 
                      ? "ring-background group-hover:ring-primary/30" 
                      : "ring-border/50 group-hover:ring-primary/30"
                  )}
                />
              ) : (
                <div className={cn(
                  "w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-2 transition-all text-primary font-semibold text-lg",
                  data.bannerUrl 
                    ? "ring-background group-hover:ring-primary/30" 
                    : "ring-border/50 group-hover:ring-primary/30"
                )}>
                  {data.name.charAt(0).toUpperCase()}
                </div>
              )}
              {data.verified && (
                <CheckCircle2 className="absolute -bottom-1 -right-1 h-5 w-5 text-primary bg-background rounded-full p-0.5" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {data.name}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">@{data.handle}</p>
              
              {data.tagline && (
                <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                  {data.tagline}
                </p>
              )}
            </div>
          </div>

          {/* Niches */}
          {data.niches && data.niches.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.niches.slice(0, 3).map((niche) => (
                <Badge key={niche} variant="secondary" className="text-xs px-2 py-0.5">
                  {niche}
                </Badge>
              ))}
              {data.niches.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{data.niches.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              {data.followerCount && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{formatFollowers(data.followerCount)}</span>
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
              variant={data.isFollowing ? "secondary" : "outline"}
              className={cn(
                "flex items-center gap-1.5 transition-all group-hover:border-primary/30",
                data.isFollowing 
                  ? "hover:bg-destructive hover:text-destructive-foreground" 
                  : "hover:bg-primary hover:text-primary-foreground"
              )}
              onClick={handleFollowClick}
            >
              {data.isFollowing ? (
                <>
                  <UserCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Following</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Follow</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}