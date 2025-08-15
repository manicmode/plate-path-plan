// src/dev/seedBillboard.ts
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const DEMO_EVENTS = (challengeId: string) => [
  { challenge_id: challengeId, kind: "rank_jump",   title: "🔥 Sally rockets to #2!",        body: "Up 3 places overnight. Morning runs paying off.", meta: { oldRank: 5, newRank: 2, delta: 3 } },
  { challenge_id: challengeId, kind: "streak",      title: "🏁 Tom hits a 14-day streak",    body: "Longest in the group so far.",                     meta: { streak: 14 } },
  { challenge_id: challengeId, kind: "group_record",title: "📈 Team record day",             body: "Average steps 12,400 — new high!",                 meta: { avg_steps: 12400 } },
  { challenge_id: challengeId, kind: "milestone",   title: "💪 Mary crosses 100km total",    body: "She's been unstoppable this week.",                meta: { distance_km: 100 } },
  { challenge_id: challengeId, kind: "comeback",    title: "⚡ Danny climbs back into top 3",body: "Was in 7th place just last week.",                 meta: { oldRank: 7, newRank: 3 } },
];

// New context-aware seeding function
export async function seedBillboardDemoEventsFor(
  contextType: 'rank_of_20' | 'private' | 'public',
  challengeId: string
) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Billboard] Seeding disabled in production');
    return;
  }

  if (!challengeId) {
    console.warn('[Billboard] No challenge ID provided for seeding');
    return;
  }

  console.log(`[Billboard] seeded: type=${contextType} id=${challengeId} count=5`);
  
  // Use the existing secure RPC for seeding
  const { error } = await supabase.rpc('seed_billboard_events', { _challenge_id: challengeId });

  if (error) {
    console.error("Seed error:", error);
    toast({ 
      title: "Seeding failed", 
      description: error.message || "Failed to seed demo events", 
      variant: "destructive" 
    });
    return;
  }
  
  console.log(`[Billboard] seeded: type=${contextType} id=${challengeId} count=5`);
  toast({ title: "Seeded!", description: `Added 5 demo events for ${contextType} challenge.` });
}

export async function seedBillboardForChallenge(challengeId: string, refresh?: () => Promise<any>) {
  if (!challengeId) {
    toast({ title: "Select a challenge first" });
    return;
  }
  
  console.log('Seeding billboard for challenge:', challengeId);
  const events = DEMO_EVENTS(challengeId);

  // Use the secure RPC for seeding
  const { error } = await supabase.rpc('seed_billboard_events', { _challenge_id: challengeId });

  if (error) {
    console.error("Seed error:", error);
    toast({ 
      title: "Seeding failed", 
      description: error.message || "Failed to seed demo events", 
      variant: "destructive" 
    });
    return;
  }
  
  console.log('Successfully seeded 5 events');
  toast({ title: "Seeded!", description: "Added 5 demo headlines." });
  await refresh?.();
}

export async function ensureMembership(challengeId: string, userId: string) {
  console.log('Ensuring membership for user', userId, 'in challenge', challengeId);
  const { error } = await (supabase as any).from("private_challenge_participations").insert({ 
    private_challenge_id: challengeId, 
    user_id: userId 
  });
  
  if (error && !error.message.includes('duplicate')) {
    console.error('Membership error:', error);
    toast({ 
      title: "Membership failed", 
      description: error.message, 
      variant: "destructive" 
    });
    return false;
  }
  
  console.log('Membership ensured');
  return true;
}

export async function seedBillboardForMyLatestChallenge() {
  const sb: any = supabase as any;

  // 1) Get current session
  const { data: sessionRes, error: sessionErr } = await sb.auth.getSession();
  if (sessionErr) throw sessionErr;
  const user = sessionRes?.session?.user;
  if (!user) throw new Error("No session");
  const userId = user.id;

  // 2) Prefer a challenge the user created; else one they participate in
  const { data: created, error: createdErr } = await sb
    .from("private_challenges")
    .select("id, created_at")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (createdErr) throw createdErr;

  let challengeId = created?.[0]?.id as string | undefined;

  if (!challengeId) {
    const { data: part, error: partErr } = await sb
      .from("private_challenge_participations")
      .select("private_challenge_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (partErr) throw partErr;
    challengeId = part?.[0]?.private_challenge_id as string | undefined;
  }

  if (!challengeId) throw new Error("No challenge found for current user");

  // 3) Seed 5 demo events
  const events = [
    {
      challenge_id: challengeId,
      kind: "rank_jump",
      title: "🔥 Sally rockets to #2!",
      body: "Up 3 places overnight. Morning runs paying off.",
      meta: { oldRank: 5, newRank: 2, delta: 3 },
    },
    {
      challenge_id: challengeId,
      kind: "streak",
      title: "🏁 Tom hits a 14-day streak",
      body: "Longest in the group so far.",
      meta: { streak: 14 },
    },
    {
      challenge_id: challengeId,
      kind: "group_record",
      title: "📈 Team record day",
      body: "Average steps 12,400 — new high!",
      meta: { avg_steps: 12400 },
    },
    {
      challenge_id: challengeId,
      kind: "milestone",
      title: "💪 Mary crosses 100km total",
      body: "She's been unstoppable this week.",
      meta: { distance_km: 100 },
    },
    {
      challenge_id: challengeId,
      kind: "comeback",
      title: "⚡ Danny climbs back into top 3",
      body: "Was in 7th place just last week.",
      meta: { oldRank: 7, newRank: 3 },
    },
  ];

  const { error } = await (sb as any).rpc('seed_billboard_events', { _challenge_id: challengeId });
  if (error) throw new Error(error.message || 'Failed to seed events');

  return { challengeId };
}