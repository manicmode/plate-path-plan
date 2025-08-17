import { Trophy } from 'lucide-react';
import { useArenaWinners } from '@/hooks/useArenaWinners';

const medal = (lvl:'gold'|'silver'|'bronze') => (
  lvl==='gold' ? '🥇' : lvl==='silver' ? '🥈' : '🥉'
);

export default function WinnersRibbon() {
  const { winners, loading } = useArenaWinners();

  if (loading) {
    return (
      <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-r from-yellow-500/10 via-purple-500/10 to-pink-500/10 p-3">
        <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wider mb-2">
          <Trophy className="h-4 w-4" /><span>Last Month's Winners</span>
        </div>
        <div className="flex gap-3">
          <div className="h-6 w-40 rounded bg-white/10 animate-pulse" />
          <div className="h-6 w-40 rounded bg-white/10 animate-pulse" />
          <div className="h-6 w-40 rounded bg-white/10 animate-pulse" />
        </div>
      </div>
    );
  }
  if (!winners.length) return null;

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-r from-yellow-500/10 via-purple-500/10 to-pink-500/10 p-3">
      <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wider mb-2">
        <Trophy className="h-4 w-4" /><span>Last Month's Winners</span>
      </div>
      <div className="flex flex-wrap gap-4">
        {winners.map(w => (
          <div key={w.user_id} className="flex items-center gap-3">
            <img
              src={w.avatar_url ?? ''}
              alt={w.display_name}
              className="h-8 w-8 rounded-full ring-2 ring-white/10 object-cover"
            />
            <div className="text-sm text-white/90">
              <span className="mr-2">{medal(w.trophy_level)}</span>
              {w.display_name}
              <span className="ml-2 text-white/60">• {w.score} pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}