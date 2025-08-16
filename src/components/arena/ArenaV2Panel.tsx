import * as React from 'react';
import { useArenaActive, useArenaMyMembership, useArenaEnroll, useArenaMembers, useArenaLeaderboardWithProfiles } from '@/hooks/arenaV2/useArena';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

function Initials({ name }: { name?: string|null }) {
  const t = (name ?? '').trim();
  if (!t) return <>{'?'}</>;
  const parts = t.split(/\s+/);
  const a = (parts[0]?.[0] ?? '').toUpperCase();
  const b = (parts[1]?.[0] ?? '').toUpperCase();
  return <>{(a+b||a||'?').slice(0,2)}</>;
}

export default function ArenaV2Panel() {
  const { data: active, isLoading: loadingActive } = useArenaActive();
  const challengeId = active?.id;
  const { data: me } = useArenaMyMembership(challengeId);
  const enroll = useArenaEnroll();
  const { data: members } = useArenaMembers(challengeId, 100, 0);
  const { data: leaderboard } = useArenaLeaderboardWithProfiles({ challengeId, section:'global', limit:50 });

  return (
    <div className="space-y-6" data-testid="arena-v2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{active?.title ?? 'Arena'}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="text-sm opacity-80">
            {loadingActive ? 'Loading…' : active ? `Season ${active.season_year}.${String(active.season_month).padStart(2,'0')}` : 'No active arena'}
          </div>
          {!me ? (
            <Button size="sm" onClick={() => enroll.mutate(challengeId)} disabled={enroll.isPending}>
              {enroll.isPending ? 'Joining…' : 'Join Arena'}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="text-xs rounded-full px-2 py-1 bg-emerald-600/10 text-emerald-700">Enrolled</div>
              {/* DEV: quick award + recompute */}
              <Button size="sm" variant="secondary" onClick={async () => {
                // use the 3-arg shim (server resolves active challenge)
                await supabase.rpc("arena_award_points", { p_points: 1, p_kind: "tap", p_challenge_id: null });
                await supabase.rpc("arena_recompute_rollups_monthly", {}); // uses current month + 'global'
              }}>
                +1 point & Recompute
              </Button>
              <Button size="sm" variant="outline" onClick={async () => {
                await supabase.rpc("arena_recompute_rollups_monthly", {}); // current month/global
              }}>
                Recompute Rollups
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(leaderboard?.length ?? 0) === 0 ? (
            <div className="text-sm opacity-70">Leaderboard warming up…</div>
          ) : (
            <ul className="space-y-2">
              {leaderboard!.map(row => (
                <li key={row.user_id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {row.avatar_url ? <AvatarImage src={row.avatar_url} alt={row.display_name ?? ''}/> : null}
                    <AvatarFallback>{(row.display_name ?? '?').slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs w-6 tabular-nums">#{row.rank}</span>
                  <span className="flex-1 truncate">{row.display_name ?? row.user_id}</span>
                  <span className="text-xs tabular-nums">{row.score}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent>
          {(members?.length ?? 0) === 0 ? (
            <div className="text-sm opacity-70">No members yet.</div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {members!.map(m => (
                <div key={m.user_id} className="flex flex-col items-center text-center">
                  <Avatar className="h-10 w-10">
                    {m.avatar_url ? <AvatarImage src={m.avatar_url} alt={m.display_name ?? ''}/> : null}
                    <AvatarFallback><Initials name={m.display_name}/></AvatarFallback>
                  </Avatar>
                  <div className="mt-1 text-xs truncate w-full">{m.display_name ?? 'Player'}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}