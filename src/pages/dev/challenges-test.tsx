// src/pages/dev/challenges-test.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  createChallenge,
  joinPublicChallenge,
  listMyChallenges,
  listMessages,
  sendChallengeMessage,
  subscribeToMessages,
  addMemberAsOwner,
  type ChallengeWithCounts,
  type ChallengeMessage,
} from "@/lib/challenges";

export default function DevChallengesPage() {
  const navigate = useNavigate();
  const [sessionReady, setSessionReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Create challenge
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  // Join public
  const [joinId, setJoinId] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);

  // My challenges
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [myChallenges, setMyChallenges] = useState<ChallengeWithCounts[]>([]);
  const [listErr, setListErr] = useState<string | null>(null);

  // Chat
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [activeChallengeOwnerId, setActiveChallengeOwnerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChallengeMessage[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [chatErr, setChatErr] = useState<string | null>(null);
  const unsubRef = useRef<() => void>();

  // Owner add member (dev-only)
  const isOwner = useMemo(
    () => !!userId && !!activeChallengeOwnerId && userId === activeChallengeOwnerId,
    [userId, activeChallengeOwnerId]
  );
  const [addUserId, setAddUserId] = useState("");
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [addOk, setAddOk] = useState<string | null>(null);

  // Session guard
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const s = data?.session;
      if (!mounted) return;
      if (!s) {
        navigate("/login");
        return;
      }
      setUserId(s.user.id);
      setSessionReady(true);
    })();
    return () => { mounted = false; };
  }, [navigate]);

  // Load my challenges
  async function refreshChallenges() {
    setLoadingChallenges(true);
    setListErr(null);
    const { data, error } = await listMyChallenges();
    if (error) setListErr(error);
    setMyChallenges(data ?? []);
    setLoadingChallenges(false);
  }

  useEffect(() => {
    if (sessionReady) refreshChallenges();
  }, [sessionReady]);

  // Open chat
  async function openChat(challengeId: string) {
    setActiveChallengeId(challengeId);
    setChatErr(null);
    // find owner for owner-only tools
    const ch = myChallenges.find((c) => c.id === challengeId);
    setActiveChallengeOwnerId(ch?.owner_user_id ?? null);

    // fetch initial messages
    const { data, error } = await listMessages(challengeId, { limit: 200 });
    if (error) setChatErr(error);
    setMessages(data ?? []);

    // subscribe realtime
    unsubRef.current?.();
    unsubRef.current = subscribeToMessages(challengeId, (msg) => {
      setMessages((prev) => {
        // dedupe if needed
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
  }

  useEffect(() => {
    return () => { unsubRef.current?.(); };
  }, []);

  async function handleCreate() {
    setCreating(true);
    setCreateErr(null);
    const { data, error } = await createChallenge({
      title: title.trim(),
      description: description.trim() || undefined,
      visibility,
      durationDays: 7,
    });
    if (error) setCreateErr(error);
    if (data) {
      setTitle(""); setDescription("");
      await refreshChallenges();
    }
    setCreating(false);
  }

  async function handleJoin() {
    setJoining(true);
    setJoinErr(null);
    const { data, error } = await joinPublicChallenge(joinId.trim());
    if (error) setJoinErr(error);
    if (data) {
      setJoinId("");
      await refreshChallenges();
    }
    setJoining(false);
  }

  async function handleSend() {
    if (!activeChallengeId || !msgText.trim()) return;
    setSending(true);
    const { error } = await sendChallengeMessage(activeChallengeId, msgText);
    if (error) setChatErr(error);
    else setMsgText("");
    setSending(false);
  }

  async function handleAddMember() {
    if (!activeChallengeId || !addUserId.trim()) return;
    setAdding(true);
    setAddErr(null);
    setAddOk(null);
    const { error } = await addMemberAsOwner(activeChallengeId, addUserId.trim());
    if (error) setAddErr(error);
    else setAddOk("User added.");
    setAdding(false);
  }

  if (!sessionReady) return null;

  return (
    <div style={{ padding: 16, maxWidth: 960, margin: "0 auto" }}>
      <h1>/dev/challenges</h1>

      <section style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
        <h2>Create Challenge</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
            <option value="public">public</option>
            <option value="private">private</option>
          </select>
          <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <button onClick={handleCreate} disabled={creating || !title.trim()}>
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
        {createErr && <div style={{ color: "crimson", marginTop: 8 }}>{createErr}</div>}
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
        <h2>Join Public Challenge</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="Challenge ID (uuid)" value={joinId} onChange={(e) => setJoinId(e.target.value)} />
          <button onClick={handleJoin} disabled={joining || !joinId.trim()}>
            {joining ? "Joining…" : "Join"}
          </button>
        </div>
        {joinErr && <div style={{ color: "crimson", marginTop: 8 }}>{joinErr}</div>}
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
        <h2>My Challenges</h2>
        <button onClick={refreshChallenges} disabled={loadingChallenges} style={{ marginBottom: 8 }}>
          {loadingChallenges ? "Refreshing…" : "Refresh"}
        </button>
        {listErr && <div style={{ color: "crimson", marginBottom: 8 }}>{listErr}</div>}
        <ul>
          {myChallenges.map((c) => (
            <li key={c.id} style={{ marginBottom: 8 }}>
              <code>{c.id}</code> — <strong>{c.title}</strong> • {c.visibility} • 👥 {c.participants}
              <button style={{ marginLeft: 8 }} onClick={() => openChat(c.id)}>Open Chat</button>
            </li>
          ))}
          {myChallenges.length === 0 && <li>No challenges yet.</li>}
        </ul>
      </section>

      {activeChallengeId && (
        <section style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
          <h2>Chat — <code>{activeChallengeId}</code></h2>
          <div style={{ maxHeight: 280, overflow: "auto", border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ padding: "4px 0", borderBottom: "1px dashed #eee" }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{new Date(m.created_at).toLocaleString()}</div>
                <div>{m.content}</div>
              </div>
            ))}
            {messages.length === 0 && <div style={{ opacity: 0.6 }}>No messages yet.</div>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Write a message…"
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              style={{ flex: 1 }}
            />
            <button onClick={handleSend} disabled={sending || !msgText.trim()}>
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
          {chatErr && <div style={{ color: "crimson", marginTop: 8 }}>{chatErr}</div>}

          {isOwner && (
            <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
              <h3>Owner Add Member (dev-only)</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="User ID to add" value={addUserId} onChange={(e) => setAddUserId(e.target.value)} />
                <button onClick={handleAddMember} disabled={adding || !addUserId.trim()}>
                  {adding ? "Adding…" : "Add Member"}
                </button>
              </div>
              {addErr && <div style={{ color: "crimson", marginTop: 8 }}>{addErr}</div>}
              {addOk && <div style={{ color: "green", marginTop: 8 }}>{addOk}</div>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}