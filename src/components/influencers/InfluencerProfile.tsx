import React, { useState } from 'react';
import { 
  CheckCircle2, Instagram, Youtube, Globe, Bell, BellRing, 
  Calendar, DollarSign, Users, UserPlus, UserCheck, X 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { InfluencerProfile, ChallengePreview } from './types';

interface InfluencerProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: InfluencerProfile | null;
  onToggleFollow?: (id: string) => void;
  onNotify?: (challengeId: string) => void;
}

// Utility functions
const formatFollowers = (count?: number): string => {
  if (!count) return '0';
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
};

const formatRelative = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Past';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `in ${diffDays} days`;
  if (diffDays < 30) return `in ${Math.ceil(diffDays / 7)} weeks`;
  return `in ${Math.ceil(diffDays / 30)} months`;
};

const formatPrice = (cents?: number): string => {
  if (!cents) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
};

function ChallengeCard({ challenge, onNotify }: { challenge: ChallengePreview; onNotify?: (id: string) => void }) {
  const [isNotifying, setIsNotifying] = useState(false);

  const handleNotifyClick = () => {
    setIsNotifying(!isNotifying);
    onNotify?.(challenge.id);
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-200">
      {challenge.bannerUrl && (
        <div className="relative h-32 overflow-hidden rounded-t-lg">
          <img
            src={challenge.bannerUrl}
            alt={challenge.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {challenge.isPaid && (
            <Badge className="absolute top-2 right-2 bg-primary">
              {formatPrice(challenge.priceCents)}
            </Badge>
          )}
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
              {challenge.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {challenge.status === 'live' ? 'Live now' : formatRelative(challenge.startAt)}
              </span>
            </div>
          </div>

          {challenge.spotsLeft && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{challenge.spotsLeft} spots left</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {!challenge.isPaid && (
              <Badge variant="outline" className="text-xs">
                Free
              </Badge>
            )}
            
            {challenge.status === 'live' ? (
              <Button size="sm" className="ml-auto">
                Join Now
              </Button>
            ) : (
              <Button
                size="sm"
                variant={isNotifying ? "secondary" : "outline"}
                onClick={handleNotifyClick}
                className="ml-auto"
              >
                {isNotifying ? (
                  <>
                    <BellRing className="h-4 w-4 mr-1.5" />
                    Notifying
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-1.5" />
                    Notify Me
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileContent({ profile, onToggleFollow, onNotify }: {
  profile: InfluencerProfile;
  onToggleFollow?: (id: string) => void;
  onNotify?: (challengeId: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative">
        {profile.bannerUrl && (
          <div className="relative h-32 md:h-40 overflow-hidden rounded-lg">
            <img
              src={profile.bannerUrl}
              alt={`${profile.name} banner`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        )}
        
        <div className={cn(
          "flex flex-col md:flex-row gap-4 items-start",
          profile.bannerUrl ? "-mt-12 relative z-10 px-4" : "px-0"
        )}>
          <div className="relative">
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover ring-4 ring-background"
            />
            {profile.verified && (
              <CheckCircle2 className="absolute -bottom-1 -right-1 h-6 w-6 text-primary bg-background rounded-full p-0.5" />
            )}
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                {profile.name}
              </h2>
              <p className="text-muted-foreground">@{profile.handle}</p>
            </div>
            
            {profile.niches && profile.niches.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.niches.map((niche) => (
                  <Badge key={niche} variant="secondary" className="text-xs">
                    {niche}
                  </Badge>
                ))}
              </div>
            )}
            
            <Button
              onClick={() => onToggleFollow?.(profile.id)}
              className={cn(
                "w-full md:w-auto",
                profile.isFollowing && "hover:bg-destructive hover:text-destructive-foreground"
              )}
              variant={profile.isFollowing ? "secondary" : "default"}
            >
              {profile.isFollowing ? (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Follow
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Social Links */}
      {profile.socials && (
        <div className="flex items-center gap-3 px-4 md:px-0">
          <TooltipProvider>
            {profile.socials.instagram && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => window.open(`https://instagram.com/${profile.socials!.instagram}`, '_blank')}
                  >
                    <Instagram className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>@{profile.socials.instagram}</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {profile.socials.youtube && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => window.open(profile.socials!.youtube, '_blank')}
                  >
                    <Youtube className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>YouTube Channel</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {profile.socials.website && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => window.open(profile.socials!.website, '_blank')}
                  >
                    <Globe className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Website</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      )}

      {/* Tabs Content */}
      <div className="px-4 md:px-0">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Bio */}
            {profile.bio && (
              <div>
                <h3 className="font-medium text-foreground mb-2">About</h3>
                <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
              </div>
            )}
            
            {/* Highlights */}
            {profile.highlights && profile.highlights.length > 0 && (
              <div>
                <h3 className="font-medium text-foreground mb-3">Quick Tips</h3>
                <ul className="space-y-2">
                  {profile.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-2 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Stats */}
            {profile.stats && (
              <div>
                <h3 className="font-medium text-foreground mb-3">Stats</h3>
                <div className="grid grid-cols-3 gap-4">
                  {profile.stats.totalFollowers && (
                    <div className="text-center">
                      <div className="text-lg font-semibold text-foreground">
                        {formatFollowers(profile.stats.totalFollowers)}
                      </div>
                      <div className="text-sm text-muted-foreground">Followers</div>
                    </div>
                  )}
                  {profile.stats.totalParticipants && (
                    <div className="text-center">
                      <div className="text-lg font-semibold text-foreground">
                        {formatFollowers(profile.stats.totalParticipants)}
                      </div>
                      <div className="text-sm text-muted-foreground">Participants</div>
                    </div>
                  )}
                  {profile.stats.challengesHosted && (
                    <div className="text-center">
                      <div className="text-lg font-semibold text-foreground">
                        {profile.stats.challengesHosted}
                      </div>
                      <div className="text-sm text-muted-foreground">Challenges</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="challenges" className="space-y-6 mt-6">
            {/* Live Challenges */}
            {profile.challenges?.live && profile.challenges.live.length > 0 && (
              <div>
                <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Live Now
                </h3>
                <div className="grid gap-4">
                  {profile.challenges.live.map((challenge) => (
                    <ChallengeCard key={challenge.id} challenge={challenge} onNotify={onNotify} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Upcoming Challenges */}
            {profile.challenges?.upcoming && profile.challenges.upcoming.length > 0 && (
              <div>
                <h3 className="font-medium text-foreground mb-4">Upcoming</h3>
                <div className="grid gap-4">
                  {profile.challenges.upcoming.map((challenge) => (
                    <ChallengeCard key={challenge.id} challenge={challenge} onNotify={onNotify} />
                  ))}
                </div>
              </div>
            )}
            
            {(!profile.challenges?.live?.length && !profile.challenges?.upcoming?.length) && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active challenges at the moment</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-32 md:h-40 w-full rounded-lg" />
        <div className="flex items-start gap-4 -mt-12 relative z-10 px-4">
          <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="px-4 space-y-4">
        <Skeleton className="h-8 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function InfluencerProfile({ 
  open, 
  onOpenChange, 
  profile, 
  onToggleFollow, 
  onNotify 
}: InfluencerProfileProps) {
  const [isMobile, setIsMobile] = useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => window.innerWidth < 768;
    setIsMobile(checkMobile());
    
    const handleResize = () => setIsMobile(checkMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile: Sheet, Desktop: Dialog
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>{profile?.name || 'Influencer Profile'}</SheetTitle>
          </SheetHeader>
          {profile ? (
            <ProfileContent profile={profile} onToggleFollow={onToggleFollow} onNotify={onNotify} />
          ) : (
            <LoadingSkeleton />
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>{profile?.name || 'Influencer Profile'}</DialogTitle>
        </DialogHeader>
        {profile ? (
          <ProfileContent profile={profile} onToggleFollow={onToggleFollow} onNotify={onNotify} />
        ) : (
          <LoadingSkeleton />
        )}
      </DialogContent>
    </Dialog>
  );
}