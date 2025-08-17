import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
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
  onOpenEmojiTray: (userId: string) => void;
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
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground mb-3">
        Live Ranking ({members.length} members)
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {members.map((member) => (
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
            className={cn(
              "group flex w-full items-center gap-3 rounded-xl p-3",
              "min-h-11 bg-gradient-to-r from-slate-50/50 to-slate-100/50",
              "dark:from-slate-800/50 dark:to-slate-700/50",
              "border border-slate-200/50 dark:border-slate-600/50",
              "hover:bg-accent hover:border-accent-foreground/20",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "transition-all duration-200 cursor-pointer",
              "shadow-sm hover:shadow-md"
            )}
            aria-label={`Open profile for ${member.display_name || 'member'}`}
          >
            {/* Rank Badge */}
            {member.rank && (
              <div className="flex-shrink-0">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-bold px-2 py-0.5",
                    member.rank === 1 && "bg-yellow-100 text-yellow-800 border-yellow-300",
                    member.rank === 2 && "bg-gray-100 text-gray-800 border-gray-300",
                    member.rank === 3 && "bg-amber-100 text-amber-800 border-amber-300"
                  )}
                >
                  #{member.rank}
                </Badge>
              </div>
            )}

            {/* Avatar */}
            <div className="flex-shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={member.avatar_url ?? undefined}
                  alt={member.display_name ?? 'user'}
                />
                <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                  <Initials name={member.display_name} />
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-foreground truncate">
                {member.display_name || 'Anonymous'}
              </div>
            </div>

            {/* Points */}
            <div className="flex-shrink-0">
              <Badge
                variant="secondary"
                className="text-xs font-medium px-2 py-0.5 bg-muted text-muted-foreground"
              >
                {member.points === 0 ? '0 pts' : `${member.points || 0} pts`}
              </Badge>
            </div>

            {/* Emoji Button */}
            <div className="flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEmojiTray(member.user_id);
                }}
                className={cn(
                  "rounded-full p-1.5 hover:bg-white/20 dark:hover:bg-black/20",
                  "transition-colors duration-200",
                  "opacity-70 hover:opacity-100",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                )}
                aria-label={`Add reaction for ${member.display_name || 'user'}`}
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}