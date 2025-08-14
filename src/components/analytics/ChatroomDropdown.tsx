import * as React from "react";
import { MessageCircle } from "lucide-react";
import { useActiveChallengeIds } from "@/hooks/challenges/useActiveChallengeIds";
import { usePublicChallenges } from "@/hooks/usePublicChallenges";
import { usePrivateChallenges } from "@/hooks/usePrivateChallenges";
import { useChatStore } from "@/store/chatStore";
import { supabase } from "@/integrations/supabase/client";

// shadcn/ui
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ChatroomDropdown() {
  const { ids, isLoading } = useActiveChallengeIds();
  const { challenges: publicChallenges } = usePublicChallenges();
  const { challengesWithParticipation: privateChallenges } = usePrivateChallenges();
  const { selectedChatroomId, selectChatroom } = useChatStore();

  const [participationChallenges, setParticipationChallenges] = React.useState<any[]>([]);

  // Fetch challenges using RPC only (no merging with other sources)
  React.useEffect(() => {
    (async () => {
      // Console tracing: supabase.auth.getUser() result
      const { data: user, error: userError } = await supabase.auth.getUser();
      console.info('[billboard-dropdown] auth.getUser()', { user: user?.user?.id, error: userError });
      
      if (!user?.user?.id) return;

      // Test RPC first
      console.info('[billboard-dropdown] testing RPC my_billboard_challenges');
      const r = await supabase.rpc('my_billboard_challenges');
      console.info('[rpc test] my_billboard_challenges', r.error, r.data);
      
      if (r.error) {
        console.error('[billboard-dropdown] RPC ERROR - stopping', r.error);
        return;
      }

      // Console tracing: raw RPC response
      console.info('[billboard-dropdown] raw RPC response', r.data);

      let items = (r.data ?? []) as Array<{
        id: string;
        title: string;
        category: string | null;
        challenge_type: string | null;
        created_at: string;
      }>;

      // Sort by newest first (no rank_of_20 challenges since RPC filters them out)
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Map to options (should only be non-rank_of_20 challenges)
      const options = items.map(x => ({
        id: x.id,
        title: x.title,
        challenge_type: x.challenge_type,
        label: `${x.title} • Private`,
        type: x.challenge_type ?? 'custom',
      }));

      // Console tracing: final options array
      console.info('[billboard-dropdown] final options array', options);

      setParticipationChallenges(options);

      // Auto-select first if none selected
      if (!selectedChatroomId && options.length > 0) {
        console.info('[billboard-dropdown] auto-selecting first option', options[0]);
        selectChatroom(options[0].id);
      }

      // Console tracing: selected id
      console.info('[billboard-dropdown] selected id', selectedChatroomId || options[0]?.id);
    })();
  }, [selectedChatroomId, selectChatroom]);

  const index = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: 'public'|'private'; count?: number }>();
    
    // Add public challenges
    (publicChallenges ?? []).forEach((c: any) => 
      map.set(c.id, { id: c.id, name: c.title ?? 'Untitled Challenge', type: 'public', count: c.participant_count ?? 0 })
    );
    
    // Add private challenges created by user
    (privateChallenges ?? []).forEach((c: any) => 
      map.set(c.id, { id: c.id, name: c.title ?? 'Untitled Challenge', type: 'private', count: (c as any).participant_count ?? 0 })
    );
    
    // Add challenges from RPC with mapped labels
    participationChallenges.forEach((c: any) => {
      map.set(c.id, { 
        id: c.id, 
        name: c.label || c.title || 'Untitled Challenge', 
        type: 'private', 
        count: 0 
      });
    });
    
    return map;
  }, [publicChallenges, privateChallenges, participationChallenges]);

  const rooms = React.useMemo(() => {
    const allRooms = ids.map(id => index.get(id)).filter(Boolean) as Array<{id:string; name:string; type:'public'|'private'; count?: number}>;
    
    // Sort alphabetically (no rank_of_20 challenges in dropdown)
    allRooms.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    
    return allRooms;
  }, [ids, index]);

  console.debug('[dropdown] activeIds', rooms.map(r => r.id));

  if (isLoading || rooms.length === 0) return null;

  const handleChange = (val: string) => {
    selectChatroom(val);
    window.dispatchEvent(
      new CustomEvent("switch-to-chat-tab", { detail: { challengeId: val } })
    );
    console.info("[chat-dropdown] selected", val);
  };

  return (
    <div className="w-full flex justify-center pt-2 pb-3">
      <div className="w-[280px] md:w-[360px]">
        <Select value={selectedChatroomId ?? ""} onValueChange={handleChange}>
          <SelectTrigger aria-label="Select chatroom" className="h-10 rounded-full justify-between bg-gradient-to-r from-primary/20 to-secondary/20 border border-white/10 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 opacity-80" />
              <SelectValue placeholder="Select chatroom" />
            </div>
          </SelectTrigger>
          <SelectContent align="center" className="max-h-[260px]">
            {rooms.map(r => (
              <SelectItem key={r.id} value={r.id}>
                {r.name} {r.type === "private" ? "• Private" : "• Public"}{r.count ? ` • ${r.count}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
