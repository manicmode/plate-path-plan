import * as React from "react";
import { MessageCircle } from "lucide-react";
import { useMyChallenges } from "@/hooks/useMyChallenges";
import { useChatStore } from "@/store/chatStore";

// shadcn/ui
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ChatroomDropdown() {
  const { data: myChallenges, isLoading } = useMyChallenges({ activeOnly: true });
  const { selectedChatroomId, selectChatroom } = useChatStore();

  const rooms = React.useMemo(
    () => (myChallenges ?? []).map(c => ({
      id: c.id,
      name: c.title ?? "Untitled Challenge",
      type: (c.visibility ?? "public") as "public" | "private",
      count: (c as any).participant_count ?? 0,
    })),
    [myChallenges]
  );

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
