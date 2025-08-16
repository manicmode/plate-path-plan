import { useArenaMyRank } from "@/hooks/useArenaBillboard";

export default function ArenaChatBadge() {
  const { rank, score, loading } = useArenaMyRank();

  if (loading) return <span className="text-xs opacity-60">arena…</span>;
  if (rank == null) return null; // not on board yet

  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
      <span>⭐</span>
      <span>Rank {rank}</span>
      <span className="opacity-70">· {score} pts</span>
    </span>
  );
}