import { useMemo } from 'react';
import { cn } from '@/lib/utils';

type Member = { user_id: string; display_name?: string; avatar_url?: string };
type MemberTabsStackProps = {
  members: Member[];
  activeUserId?: string;
  onSelect?: (userId: string) => void;
};

export default function MemberTabsStack({ members, activeUserId, onSelect }: MemberTabsStackProps) {
  const items = useMemo(() => (members ?? []).slice(0, 12), [members]);

  if (!items.length) return null;

  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <div className="flex gap-2 py-2">
        {items.map(m => {
          const active = m.user_id === activeUserId;
          return (
            <button
              key={m.user_id}
              onClick={() => onSelect?.(m.user_id)}
              className={cn(
                'px-3 py-1 rounded-full border text-sm whitespace-nowrap transition',
                active ? 'border-primary bg-primary/10' : 'border-muted-foreground/20 hover:bg-muted/50'
              )}
              aria-pressed={active}
            >
              {m.display_name ?? m.user_id.slice(0, 6)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Legacy exports for compatibility
export type MemberTab = Member;