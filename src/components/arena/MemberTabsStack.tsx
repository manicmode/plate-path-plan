import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MemberTab = {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  points?: number;
  rank?: number | null;
};

interface MemberTabsStackProps {
  members: MemberTab[];
  onOpenProfile: (member: MemberTab) => void;
  onOpenEmojiTray?: (userId: string) => void; // Made optional
  onPrefetchStats: (userId: string) => void;
}

function Initials({ name }: { name?: string | null }) {
  const t = (name ?? '').trim();
  if (!t) return <>{'?'}</>;
  const parts = t.split(/\s+/);
  const a = (parts[0]?.[0] ?? '').toUpperCase();
  const b = (parts[1]?.[0] ?? '').toUpperCase();
  return <>{(a + b || a || '?').slice(0, 2)}</>;
}

export default function MemberTabsStack({
  members,
  onOpenProfile,
  onOpenEmojiTray,
  onPrefetchStats,
}: MemberTabsStackProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <div className="text-sm">No members yet. Be the first to join!</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.slice(0, 6).map((member, index) => {
        const rank = index + 1;
        // Format points with comma separator
        const formatPoints = (points: number) => {
          return points.toLocaleString();
        };

        return (
          <div
            key={member.user_id}
            role="button"
            tabIndex={0}
            onClick={() => onOpenProfile(member)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenProfile(member);
              }
            }}
            onMouseEnter={() => onPrefetchStats(member.user_id)}
            onFocus={() => onPrefetchStats(member.user_id)}
            className="relative rounded-xl bg-muted/50 border border-border p-4 cursor-pointer hover:bg-muted transition-all duration-200 min-h-[80px]"
          >
            {/* Orange rank badge (left side) */}
            <span
              className="absolute -left-3 -top-3 z-20 rounded-full px-2.5 py-1 text-sm font-bold shadow-md bg-orange-500 text-black"
            >
              #{rank}
            </span>

            <div className="flex items-center justify-between pl-4">
              {/* Left side: Avatar + Name + Streak */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage 
                    src={member.avatar_url || undefined} 
                    alt={member.display_name || "user"}
                    className="object-cover"
                    onError={() => console.log(`Avatar failed to load for ${member.display_name}:`, member.avatar_url)}
                    onLoad={() => console.log(`Avatar loaded for ${member.display_name}:`, member.avatar_url)}
                  />
                  <AvatarFallback className="bg-teal-500 text-white font-semibold text-sm">
                    <Initials name={member.display_name} />
                  </AvatarFallback>
                </Avatar>
                
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground text-base truncate">
                    {member.display_name ?? member.user_id}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Flame className="h-3 w-3 text-orange-500" />
                    <span>0 streak</span>
                  </div>
                </div>
              </div>

              {/* Right side: Rising indicator + Points */}
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <TrendingUp className="h-3 w-3" />
                  <span>↗︎ Rising</span>
                </div>
                <div className="flex items-center gap-1 text-foreground">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-bold text-foreground">{formatPoints(member.points || 0)}</span>
                  <span className="text-sm text-muted-foreground">pts</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}