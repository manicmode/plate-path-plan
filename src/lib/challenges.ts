// src/lib/challenges.ts
import { supabase } from "@/integrations/supabase/client";

/** Types **/
export type ChallengeVisibility = "public" | "private";
export type MemberRole = "owner" | "member";
export type MemberStatus = "joined" | "left" | "banned";

export interface Challenge {
  id: string; // uuid
  title: string;
  description: string | null;
  category: string | null;
  visibility: ChallengeVisibility;
  duration_days: number;
  cover_emoji: string | null;
  invite_code: string | null;
  owner_user_id: string; // uuid
  created_at: string; // ISO
}

export interface ChallengeWithCounts extends Challenge {
  participants: number;
}

export interface ChallengeMember {
  challenge_id: string; // uuid
  user_id: string; // uuid
  role: MemberRole;
  status: MemberStatus;
  joined_at: string; // ISO
}

export interface ChallengeMessage {
  id: number; // bigint
  challenge_id: string; // uuid
  user_id: string; // uuid
  content: string;
  created_at: string; // ISO
}

/** Utilities **/
function normalizeError(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) return String((e as any).message);
  return "Unknown error";
}

async function getUserId(): Promise<{ userId?: string; error?: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return { error: normalizeError(error) };
  const userId = data?.user?.id;
  if (!userId) return { error: "No authenticated user" };
  return { userId };
}

/** Create a challenge (owner = current user) */
export async function createChallenge(payload: {
  title: string;
  description?: string | null;
  visibility: 'public' | 'private';
  durationDays: number;
  coverEmoji?: string | null;
}) {
  const { data: session } = await supabase.auth.getSession();
  const uid = session?.session?.user?.id;
  if (!uid) return { data: null, error: 'Not authenticated' };

  const id = crypto.randomUUID();

  const insert = {
    id,
    title: payload.title,
    description: payload.description ?? null,
    visibility: payload.visibility,
    duration_days: payload.durationDays,
    cover_emoji: payload.coverEmoji ?? null,
    owner_user_id: uid,
  };

  console.log('[createChallenge] start', insert);

  const { error: insErr } = await supabase
    .from('challenges')
    .insert(insert); // ← no RETURNING, no SELECT, no policy recursion

  if (insErr) {
    console.error('[createChallenge] insert error', insErr);
    return { data: null, error: insErr.message };
  }

  // Auto-enroll creator as member (role owner)
  const { error: memErr } = await supabase
    .from('challenge_members')
    .upsert({
      challenge_id: id,
      user_id: uid,
      role: 'owner',
      status: 'joined',
      joined_at: new Date().toISOString(),
    }, { onConflict: 'challenge_id,user_id', ignoreDuplicates: true });

  if (memErr) {
    // Log but don't fail the whole flow; feed will still show via owner filter once implemented
    console.warn('[createChallenge] auto-enroll failed', memErr);
  }

  return { data: { id }, error: null };
}

/** Join a public challenge as the current user */
export async function joinPublicChallenge(challengeId: string): Promise<{ data?: ChallengeMember; error?: string }> {
  const { userId, error: authErr } = await getUserId();
  if (authErr) return { error: authErr };

  const { data, error } = await supabase
    .from("challenge_members")
    .insert({
      challenge_id: challengeId,
      user_id: userId!,
      role: "member",
      status: "joined",
    })
    .select("*")
    .single();

  if (error) return { error: normalizeError(error) };
  return { data: data as ChallengeMember };
}

/** Owner adds a member (for private challenges or invites) */
export async function addMemberAsOwner(
  challengeId: string,
  userIdToAdd: string
): Promise<{ data?: ChallengeMember; error?: string }> {
  // RLS ensures only owner can do this insert
  const { data, error } = await supabase
    .from("challenge_members")
    .insert({
      challenge_id: challengeId,
      user_id: userIdToAdd,
      role: "member",
      status: "joined",
    })
    .select("*")
    .single();

  if (error) return { error: normalizeError(error) };
  return { data: data as ChallengeMember };
}

/** Send a chat message in a challenge */
export async function sendChallengeMessage(
  challengeId: string,
  content: string
): Promise<{ data?: ChallengeMessage; error?: string }> {
  const { userId, error: authErr } = await getUserId();
  if (authErr) return { error: authErr };
  if (!content?.trim()) return { error: "Message content is required" };

  const { data, error } = await supabase
    .from("challenge_messages")
    .insert({
      challenge_id: challengeId,
      user_id: userId!,
      content: content.trim(),
    })
    .select("*")
    .single();

  if (error) return { error: normalizeError(error) };
  return { data: data as ChallengeMessage };
}

/** List MY challenges (owner or joined) with participant counts */
export async function listMyChallenges(): Promise<{ data?: ChallengeWithCounts[]; error?: string }> {
  const { userId, error: authErr } = await getUserId();
  if (authErr) return { error: authErr };

  // Get challenges where user is owner or member
  const { data: challengeData, error: challengeErr } = await supabase
    .from("challenges")
    .select(`
      *,
      challenge_members!inner(user_id, status)
    `)
    .or(`owner_user_id.eq.${userId},challenge_members.user_id.eq.${userId}`)
    .eq("challenge_members.status", "joined")
    .order("created_at", { ascending: false });

  if (challengeErr) return { error: normalizeError(challengeErr) };

  // Add participant counts
  const challengesWithCounts: ChallengeWithCounts[] = [];
  
  for (const challenge of challengeData ?? []) {
    const { count, error: countErr } = await supabase
      .from("challenge_members")
      .select("*", { count: "exact", head: true })
      .eq("challenge_id", challenge.id)
      .eq("status", "joined");

    if (countErr) return { error: normalizeError(countErr) };

    challengesWithCounts.push({
      ...challenge,
      participants: count ?? 0,
    });
  }

  return { data: challengesWithCounts };
}

/** List public challenges with participant counts */
export async function listPublicChallenges(): Promise<{ data?: ChallengeWithCounts[]; error?: string }> {
  const { data: challengeData, error: challengeErr } = await supabase
    .from("challenges")
    .select("*")
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  if (challengeErr) return { error: normalizeError(challengeErr) };

  // Add participant counts
  const challengesWithCounts: ChallengeWithCounts[] = [];
  
  for (const challenge of challengeData ?? []) {
    const { count, error: countErr } = await supabase
      .from("challenge_members")
      .select("*", { count: "exact", head: true })
      .eq("challenge_id", challenge.id)
      .eq("status", "joined");

    if (countErr) return { error: normalizeError(countErr) };

    challengesWithCounts.push({
      ...challenge,
      participants: count ?? 0,
    });
  }

  return { data: challengesWithCounts };
}

/** Get challenge details by ID */
export async function getChallengeById(challengeId: string): Promise<{ data?: Challenge; error?: string }> {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .single();

  if (error) return { error: normalizeError(error) };
  return { data: data as Challenge };
}

/** List messages (ascending), optional pagination via `before` */
export async function listMessages(
  challengeId: string,
  opts?: { limit?: number; before?: string }
): Promise<{ data?: ChallengeMessage[]; error?: string }> {
  const limit = Math.max(1, Math.min(opts?.limit ?? 100, 500));
  let q = supabase
    .from("challenge_messages")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (opts?.before) q = q.lt("created_at", opts.before);

  const { data, error } = await q;
  if (error) return { error: normalizeError(error) };
  return { data: (data ?? []) as ChallengeMessage[] };
}

/** Leave a challenge */
export async function leaveChallenge(challengeId: string): Promise<{ data?: boolean; error?: string }> {
  const { userId, error: authErr } = await getUserId();
  if (authErr) return { error: authErr };

  const { error } = await supabase
    .from("challenge_members")
    .update({ status: "left" })
    .eq("challenge_id", challengeId)
    .eq("user_id", userId!);

  if (error) return { error: normalizeError(error) };
  return { data: true };
}

/** Delete a challenge (owner only) */
export async function deleteChallenge(challengeId: string): Promise<{ data?: boolean; error?: string }> {
  const { error } = await supabase
    .from("challenges")
    .delete()
    .eq("id", challengeId);

  if (error) return { error: normalizeError(error) };
  return { data: true };
}

/** Realtime subscription to new messages for a challenge */
export function subscribeToMessages(
  challengeId: string,
  cb: (msg: ChallengeMessage) => void
): () => void {
  const channel = supabase
    .channel(`challenge-messages-${challengeId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "challenge_messages",
        filter: `challenge_id=eq.${challengeId}`,
      },
      (payload) => {
        if (payload?.new) cb(payload.new as ChallengeMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}