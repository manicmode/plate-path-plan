import { useCallback, useMemo, useState } from "react";

type TargetKey = string; // e.g., `msg:${messageId}` or `user:${userId}`

export type ReactionMap = Record<TargetKey, Record<string, number>>;

export function useEmojiReactions() {
  const [reactions, setReactions] = useState<ReactionMap>({});

  const addReaction = useCallback((key: TargetKey, emoji: string) => {
    setReactions(prev => {
      const byTarget = prev[key] ?? {};
      const count = (byTarget[emoji] ?? 0) + 1;
      return { ...prev, [key]: { ...byTarget, [emoji]: count } };
    });
  }, []);

  const getReactions = useCallback((key: TargetKey) => reactions[key] ?? {}, [reactions]);

  return useMemo(() => ({ addReaction, getReactions, reactions }), [addReaction, getReactions, reactions]);
}