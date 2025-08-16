import { useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { awardArenaPoints } from "@/lib/arena/awardArenaPoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function ArenaTestPanel() {
  const [points, setPoints] = useState<number>(5);
  const [kind, setKind] = useState("streak");
  const [challengeId, setChallengeId] = useState<string>("");
  const [useIdem, setUseIdem] = useState(true);
  const [log, setLog] = useState<string>("");
  const [events, setEvents] = useState<any[]>([]);

  async function refreshEvents() {
    const { data, error } = await supabase
      .from("arena_events")
      .select("challenge_id,user_id,points,kind,idem_key,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(10);
    if (error) setLog(prev => prev + `\n[ERR] fetch events: ${error.message}`);
    else setEvents(data ?? []);
  }

  async function doOnce() {
    const idem = useIdem ? uuidv4() : null;
    try {
      await awardArenaPoints({
        points,
        kind,
        challengeId: challengeId || null,
        idemKey: idem
      });
      setLog(prev => prev + `\n[OK] Awarded ${points} ${kind} (idem=${idem ?? "none"})`);
    } catch (e: any) {
      setLog(prev => prev + `\n[ERR] ${e.message}`);
    } finally {
      await refreshEvents();
    }
  }

  async function doTwice() {
    const idem = useIdem ? uuidv4() : null;
    try {
      await awardArenaPoints({ points, kind, challengeId: challengeId || null, idemKey: idem });
      setLog(prev => prev + `\n[OK] First award (idem=${idem ?? "none"})`);
      await awardArenaPoints({ points, kind, challengeId: challengeId || null, idemKey: idem });
      setLog(prev => prev + `\n[OK] Second award (idem=${idem ?? "none"})`); // if idem on, this should actually error
    } catch (e: any) {
      setLog(prev => prev + `\n[EXPECTED] Second call error: ${e.message}`);
    } finally {
      await refreshEvents();
    }
  }

  async function awardAndRecompute() {
    try {
      // Award 1 point and then recompute rollups
      await supabase.rpc('arena_award_points', { 
        p_points: 1, 
        p_kind: 'tap', 
        p_challenge_id: null 
      });
      setLog(prev => prev + `\n[OK] Awarded 1 tap point`);
      
      await supabase.rpc('arena_recompute_rollups_monthly', {});
      setLog(prev => prev + `\n[OK] Recomputed monthly rollups`);
    } catch (e: any) {
      setLog(prev => prev + `\n[ERR] ${e.message}`);
    } finally {
      await refreshEvents();
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Arena Test Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Points</Label>
            <Input type="number" value={points} onChange={e => setPoints(Number(e.target.value))}/>
          </div>
          <div>
            <Label>Kind</Label>
            <Input value={kind} onChange={e => setKind(e.target.value)}/>
          </div>
          <div className="col-span-2">
            <Label>Challenge ID (optional)</Label>
            <Input placeholder="leave blank to auto-resolve active challenge"
                   value={challengeId} onChange={e => setChallengeId(e.target.value)}/>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Switch checked={useIdem} onCheckedChange={setUseIdem}/>
            <Label>Provide idemKey (prevents duplicates)</Label>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={doOnce}>Award Once</Button>
          <Button variant="secondary" onClick={doTwice}>Award Twice (dup test)</Button>
          <Button variant="outline" onClick={awardAndRecompute}>Award + Recompute</Button>
          <Button variant="ghost" onClick={refreshEvents}>Refresh Events</Button>
        </div>

        <pre className="text-xs whitespace-pre-wrap max-h-48 overflow-auto border rounded p-2">{log}</pre>

        <div className="space-y-2">
          <div className="text-sm font-medium">Recent Events</div>
          <div className="space-y-1 text-xs">
            {events.map((e,i) => (
              <div key={i} className="border rounded p-2">
                <div><b>{e.kind}</b> • {e.points} pts • idem={e.idem_key ?? "—"}</div>
                <div>challenge={e.challenge_id} • at={e.occurred_at}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}