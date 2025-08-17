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

// TEMP HOTFIX: disable vertical list rendering (was imitating leaderboard rows)
export default function MemberTabsStack(props: MemberTabsStackProps) {
  return null;
}