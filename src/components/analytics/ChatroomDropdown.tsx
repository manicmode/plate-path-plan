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

  // Fetch challenges using the new RPC
  React.useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase.rpc('my_billboard_challenges');
      if (error) {
        console.error('[billboard-dropdown] rpc error', error);
        return;
      }
      console.info('[billboard-dropdown] options', data);
      let options = (data ?? []).sort((a, b) => {
        if (a.challenge_type === 'rank_of_20' && b.challenge_type !== 'rank_of_20') return -1;
        if (b.challenge_type === 'rank_of_20' && a.challenge_type !== 'rank_of_20') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setParticipationChallenges(options);

      // Auto-select first option if no selection
      if (!selectedChatroomId && options.length > 0) {
        selectChatroom(options[0].id);
      }
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
    
    // Add challenges from RPC with proper labeling
    participationChallenges.forEach((c: any) => {
      let displayName;
      if (c.challenge_type === 'rank_of_20') {
        displayName = 'Rank of 20';
      } else {
        displayName = c.title ?? 'Untitled Challenge';
      }
      map.set(c.id, { id: c.id, name: displayName, type: 'private', count: 0 });
    });
    
    return map;
  }, [publicChallenges, privateChallenges, participationChallenges]);

  const rooms = React.useMemo(() => {
    const allRooms = ids.map(id => index.get(id)).filter(Boolean) as Array<{id:string; name:string; type:'public'|'private'; count?: number}>;
    
    // Sort Rank-of-20 first (check both challenge_type and title)
    allRooms.sort((a, b) => {
      const challenge_a = participationChallenges.find(c => c.id === a.id);
      const challenge_b = participationChallenges.find(c => c.id === b.id);
      
      const ra = challenge_a?.challenge_type === 'rank_of_20' ? 0 : 1;
      const rb = challenge_b?.challenge_type === 'rank_of_20' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      
      return (a.name || "").localeCompare(b.name || "");
    });
    
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
