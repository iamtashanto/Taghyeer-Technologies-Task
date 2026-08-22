"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Crown, MessageCircle, Plus, Search, Send, UserMinus, UserPlus, Users, Smile, Reply, SmilePlus } from "lucide-react";
import { api, Conversation, Message, normalizeConversation, normalizeMessage, normalizeUser, SOCKET_URL, User } from "@/lib/api";
import EmojiPicker from 'emoji-picker-react';

type Session = { token: string; user: User };

export default function ChatPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [manageTarget, setManageTarget] = useState<User | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);

  const [addMemberQuery, setAddMemberQuery] = useState("");
  const [addMemberResults, setAddMemberResults] = useState<User[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [readTimestamps, setReadTimestamps] = useState<Record<string, number>>({});

  const endRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottom = useRef(true);
  const socketRef = useRef<import("socket.io-client").Socket | null>(null);
  const activeIdRef = useRef<string | undefined>(active?.id);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeId = active?.id;
  const isGroup = active?.type === "group";
  const activeAdminIds = useMemo(() => active?.admins ?? [], [active]);
  const isAdmin = !!session && activeAdminIds.includes(session.user.id);

  function handleSetActive(item: Conversation | null) {
    setActive(item);
    if (item) {
      window.history.replaceState(null, '', `?chat=${item.id}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  async function refreshConversations(currentToken: string, currentUserId?: string) {
    try {
      const next = await api.conversations(currentToken, currentUserId);
      setConversations(next);
      
      const params = new URLSearchParams(window.location.search);
      const urlChatId = params.get("chat");
      
      let targetId = activeIdRef.current;
      if (!targetId && urlChatId) targetId = urlChatId;

      if (targetId) {
        const latestActive = next.find((item) => item.id === targetId);
        if (latestActive) setActive(latestActive);
      }
    } finally {
      setLoadingConversations(false);
    }
  }

  useEffect(() => {
    const stored = window.localStorage.getItem("relay-session");
    if (!stored) {
      setCheckingSession(false);
      return;
    }
    const parsed = JSON.parse(stored) as Session;
    setSession(parsed); // optimistically set session
    api.me(parsed.token).then((value) => {
      setSession({ token: parsed.token, user: normalizeUser(value) });
    }).catch(() => {
      window.localStorage.removeItem("relay-session");
      setSession(null);
    }).finally(() => {
      setCheckingSession(false);
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    refreshConversations(session.token, session.user.id).catch((e: Error) => setError(e.message));
  }, [session]);

  useEffect(() => {
    activeIdRef.current = activeId;
    setShowParticipants(false);
  }, [activeId]);

  useEffect(() => {
    const stored = window.localStorage.getItem("relay-read-timestamps");
    if (stored) {
      try {
        setReadTimestamps(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (activeId) {
      setReadTimestamps((prev) => {
        const next = { ...prev, [activeId]: Date.now() };
        window.localStorage.setItem("relay-read-timestamps", JSON.stringify(next));
        return next;
      });
    }
  }, [activeId, messages.length]);

  useEffect(() => {
    if (!session || !activeId) return;
    setLoading(true);
    api.messages(activeId, session.token)
      .then((msgs) => {
        const sorted = [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages(sorted);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeId, session]);

  useEffect(() => {
    if (!activeId || !shouldStickToBottom.current) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeId]);

  useEffect(() => {
    if (!session || !query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(() => {
      api.searchUsers(query.trim(), session.token)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => {
      window.clearTimeout(timer);
    };
  }, [query, session]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    import("socket.io-client").then(({ io }) => {
      if (cancelled) return;
      const socket = io(SOCKET_URL, { auth: { token: session.token }, transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("message:new", (payload: unknown) => {
        refreshConversations(session.token, session.user.id).catch(() => undefined);
        if (activeIdRef.current) {
          api.messages(activeIdRef.current, session.token)
            .then((msgs) => {
              const sorted = [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              setMessages(sorted);
            })
            .catch(() => undefined);
        }
      });

      socket.on("conversation:updated", () => {
        refreshConversations(session.token, session.user.id).catch(() => undefined);
      });
    });

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [session]);

  useEffect(() => {
    if (!session || !addMemberQuery.trim()) {
      setAddMemberResults([]);
      setAddingMember(false);
      return;
    }
    setAddingMember(true);
    const timer = window.setTimeout(() => {
      api.searchUsers(addMemberQuery.trim(), session.token)
        .then(setAddMemberResults)
        .catch(() => setAddMemberResults([]))
        .finally(() => setAddingMember(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [addMemberQuery, session]);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (!phone.trim() || !name.trim()) return setError("Phone number and name are required.");
    setBusy(true);
    setError("");
    try {
      const response = await api.login({ phone: phone.trim(), name: name.trim() });
      const token = String(response.token ?? response.accessToken ?? "");
      if (!token) throw new Error("The API did not return a session token.");
      const user = normalizeUser(response.user ?? { name, phone, id: "me" });
      const nextSession = { token, user };
      window.localStorage.setItem("relay-session", JSON.stringify(nextSession));
      setSession(nextSession);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function openDirect(user: User) {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      let next = await api.startConversation(user.id, session.token, session.user.id);
      if (next.name === "Conversation" || next.name === "Unknown user" || !next.name) {
        next = { ...next, name: user.name, participants: next.participants.length ? next.participants : [session.user, user] };
      }
      setConversations((current) => [next, ...current.filter((item) => item.id !== next.id)]);
      handleSetActive(next);
      setQuery("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function toggleMember(user: User) {
    setGroupMembers((current) => current.some((item) => item.id === user.id) ? current.filter((item) => item.id !== user.id) : [...current, user]);
  }

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    if (!session || !groupName.trim() || !groupMembers.length) return setError("Add at least one person and a group name.");
    setBusy(true);
    setError("");
    try {
      const next = await api.createGroup(groupName.trim(), groupMembers.map((item) => item.id), session.token, session.user.id);
      setConversations((current) => [next, ...current]);
      handleSetActive(next);
      setGroupName("");
      setGroupMembers([]);
      setGroupOpen(false);
      setQuery("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function renameGroup(event: FormEvent) {
    event.preventDefault();
    if (!session || !active || !isGroup || !isAdmin || !renameValue.trim()) return;
    setBusy(true);
    setError("");
    const newName = renameValue.trim();
    const previousName = active.name;
    // Optimistically update
    setActive({ ...active, name: newName });
    setConversations((current) => current.map((c) => c.id === active.id ? { ...c, name: newName } : c));
    try {
      await api.renameGroup(active.id, newName, session.token);
      await refreshConversations(session.token, session.user.id);
      setRenameValue("");
    } catch (e) {
      // Revert on error
      setActive({ ...active, name: previousName });
      setConversations((current) => current.map((c) => c.id === active.id ? { ...c, name: previousName } : c));
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addToGroup(user: User) {
    if (!session || !active || !isGroup || !isAdmin) return;
    setBusy(true);
    setError("");
    try {
      await api.addParticipants(active.id, [user.id], session.token);
      await refreshConversations(session.token, session.user.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeFromGroup(user: User) {
    if (!session || !active || !isGroup || !isAdmin) return;
    setBusy(true);
    setError("");
    try {
      await api.removeParticipant(active.id, user.id, session.token);
      await refreshConversations(session.token, session.user.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function promoteToAdmin(user: User) {
    if (!session || !active || !isGroup || !isAdmin) return;
    setBusy(true);
    setError("");
    try {
      await api.promoteAdmin(active.id, user.id, session.token);
      await refreshConversations(session.token, session.user.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function leaveGroup() {
    if (!session || !active || !isGroup) return;
    setBusy(true);
    setError("");
    try {
      await api.removeParticipant(active.id, session.user.id, session.token);
      const next = conversations.filter((item) => item.id !== active.id);
      setConversations(next);
      handleSetActive(next[0] ?? null);
      setMessages([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!session || !active || !text.trim() || busy) return;
    const value = text.trim();
    setText("");
    setBusy(true);
    const optimistic = normalizeMessage({ id: crypto.randomUUID(), text: value, senderId: session.user.id, createdAt: new Date().toISOString() });
    setMessages((current) => [...current, optimistic]);
    try {
      const sent = await api.sendMessage(active.id, value, session.token);
      setMessages((current) => {
        const filtered = current.filter((item) => item.id !== optimistic.id);
        if (filtered.some((m) => m.id === sent.id)) return filtered; // Already added by socket
        return [...filtered, sent];
      });
    } catch (e) {
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setText(value);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    window.localStorage.removeItem("relay-session");
    setSession(null);
    handleSetActive(null);
  }

  if (checkingSession && !session) {
    return (
      <main className="grid h-screen overflow-hidden grid-cols-[280px_1fr] bg-cream max-[800px]:grid-cols-1 animate-pulse">
        <aside className="bg-ink px-[18px] pt-[25px] pb-[25px] flex flex-col gap-[20px]">
          <div className="h-[31px] w-[100px] bg-[#293732] rounded-[4px] mx-[10px] mb-[22px]"></div>
          <div className="h-[25px] bg-[#293732] rounded-[9px] mx-[4px]"></div>
          <div className="h-[60px] bg-[#293732] rounded-[10px] mx-[4px]"></div>
          <div className="h-[60px] bg-[#293732] rounded-[10px] mx-[4px]"></div>
          <div className="h-[60px] bg-[#293732] rounded-[10px] mx-[4px]"></div>
        </aside>
        <section className="flex flex-col">
          <header className="flex min-h-[82px] items-center justify-between border-b border-line p-[16px_34px]">
            <div className="flex items-center gap-[13px]"><div className="h-[35px] w-[35px] bg-[#edf0e8] rounded-[12px_12px_12px_4px]"></div><div><div className="h-[18px] w-[120px] bg-[#edf0e8] rounded mb-[4px]"></div><div className="h-[11px] w-[80px] bg-[#edf0e8] rounded"></div></div></div>
          </header>
          <div className="flex-1 p-[30px_clamp(20px,8vw,130px)]"></div>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper p-6">
        <form className="w-[min(440px,100%)] border border-line bg-cream p-[42px] shadow-relay max-[500px]:p-[28px]" onSubmit={login}>
          <Link className="flex items-center gap-[10px] text-[18px] font-extrabold tracking-[-0.04em]" href="/"><span className="grid h-[31px] w-[31px] place-items-center rounded-[10px_10px_10px_3px] bg-ink font-dmmono text-[13px] text-lime">r/</span> relay</Link>
          <h1 className="mt-[50px] mb-[12px] max-w-[670px] text-[42px] leading-[0.96] tracking-[-0.075em]">Make room for a good conversation.</h1>
          <p className="text-[13px] leading-[1.7] text-muted">Sign in with your phone number. New numbers are registered automatically.</p>
          {error && <div className="mt-[15px] mx-[25px] p-[12px_15px] border border-[#f3b8ad] rounded-[9px] text-[#9a392c] bg-[#fff1ee] text-[12px]">{error}</div>}
          <label className="my-[23px] block font-dmmono text-[10px] uppercase tracking-[0.08em] text-muted">Your name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ada Lovelace" className="mt-[9px] w-full border-0 border-b border-[#b9c0b7] bg-transparent p-[14px_0] font-manrope text-[16px] text-ink outline-none" /></label>
          <label className="my-[23px] block font-dmmono text-[10px] uppercase tracking-[0.08em] text-muted">Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 123 4567" type="tel" className="mt-[9px] w-full border-0 border-b border-[#b9c0b7] bg-transparent p-[14px_0] font-manrope text-[16px] text-ink outline-none" /></label>
          <button className="mt-[12px] inline-flex w-full items-center justify-center gap-[9px] rounded-full bg-lime px-[20px] py-[15px] text-[14px] font-extrabold text-ink shadow-[0_8px_20px_rgba(143,170,34,0.18)]" disabled={busy}>{busy ? "Connecting..." : "Enter workspace"}<ArrowLeft size={16} style={{ transform: "rotate(180deg)" }} /></button>
        </form>
      </main>
    );
  }

  return (
    <main className="grid h-[100dvh] overflow-hidden grid-cols-[280px_1fr] bg-cream max-[800px]:grid-cols-1">
      <aside className="flex flex-col bg-ink px-[18px] pt-[25px] pb-[25px] text-cream max-[800px]:min-h-0 max-[800px]:p-[17px]">
        <Link className="mx-[10px] mb-[42px] flex items-center gap-[10px] text-[18px] font-extrabold tracking-[-0.04em] max-[800px]:mb-[20px]" href="/"><span className="grid h-[31px] w-[31px] place-items-center rounded-[10px_10px_10px_3px] bg-lime font-dmmono text-[13px] text-ink">r/</span> relay</Link>

        <div className="mx-[10px] mb-[14px] flex items-center justify-between font-dmmono text-[10px] uppercase tracking-[0.1em] text-[#77847d] max-[800px]:hidden">Conversations<button className="grid h-[25px] w-[25px] place-items-center rounded-[7px] border border-[#405049] bg-transparent text-lime" onClick={() => { setGroupOpen((open) => !open); setQuery(""); }} aria-label="Create group"><Plus size={14} /></button></div>

        {!groupOpen && (
          <div className="mx-[4px] mb-[20px] flex items-center gap-[8px] rounded-[9px] border border-[#3b4842] p-[10px_12px] text-[#87928a] max-[800px]:hidden"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find someone..." className="w-full border-0 bg-transparent text-[12px] text-cream outline-none" /></div>
        )}

        {groupOpen && (
          <form className="mx-[4px] mb-[20px] flex flex-col gap-[10px] rounded-[12px] border border-[#405049] bg-[#23312c] p-[14px] shadow-[0_8px_20px_rgba(0,0,0,0.2)]" onSubmit={createGroup}>
            <div className="flex items-center justify-between mb-[2px]">
              <span className="text-[12px] font-extrabold text-lime">Create a New Group</span>
              <button type="button" onClick={() => { setGroupOpen(false); setQuery(""); setGroupMembers([]); setGroupName(""); }} className="text-[#8c9991] hover:text-cream" aria-label="Close">&times;</button>
            </div>

            <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group Name" className="w-full rounded-[8px] border border-[#405049] bg-[#1a2521] p-[10px_12px] text-[12px] text-cream outline-none focus:border-[#62bc78] transition-colors" />

            <div className="flex items-center gap-[8px] bg-[#1a2521] rounded-[8px] border border-[#405049] px-[12px] py-[10px] focus-within:border-[#62bc78] transition-colors">
              <Search size={14} className="text-[#87928a]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people to add..." className="w-full bg-transparent text-[12px] outline-none text-cream" />
            </div>

            {query && (
              <div className="flex flex-col gap-[2px] max-h-[140px] overflow-auto rounded-[6px]">
                {searching ? (
                  <div className="p-[10px] text-center text-[10px] text-muted animate-pulse">Searching...</div>
                ) : results.length ? results.map((user) => {
                  const isAdded = groupMembers.some((m) => m.id === user.id);
                  return (
                    <button type="button" key={user.id} onClick={() => toggleMember(user)} className={`flex items-center justify-between p-[8px_10px] rounded-[6px] text-left text-[11px] ${isAdded ? "bg-[#31453e] text-lime" : "hover:bg-[#31453e] text-cream"}`}>
                      <span>{user.name}</span>
                      {isAdded ? <span className="text-[10px] font-bold">&times; Remove</span> : <span className="text-[10px] text-[#8c9991]">+ Add</span>}
                    </button>
                  );
                }) : <div className="p-[10px] text-center text-[10px] text-muted">No people found</div>}
              </div>
            )}

            {groupMembers.length > 0 && (
              <div className="mt-[4px]">
                <div className="text-[10px] uppercase tracking-[0.05em] text-[#8c9991] mb-[6px] font-bold">Selected Members ({groupMembers.length})</div>
                <div className="flex flex-wrap gap-[6px]">
                  {groupMembers.map(m => (
                    <span key={m.id} className="flex items-center gap-[4px] bg-[#31453e] rounded-full p-[4px_8px] text-[10px] text-cream shadow-sm">
                      {m.name}
                      <button type="button" onClick={() => toggleMember(m)} className="text-[#a4b5aa] hover:text-[#f3b8ad] font-bold ml-[2px]">&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button className="mt-[6px] w-full items-center justify-center rounded-[8px] bg-lime p-[10px] text-[12px] font-extrabold text-ink transition-opacity hover:opacity-90 disabled:opacity-50" disabled={busy || !groupName.trim() || groupMembers.length === 0}>{busy ? "Creating..." : "Create group"}</button>
          </form>
        )}

        {!groupOpen && query && (
          <div className="flex flex-col gap-[3px] overflow-auto max-[800px]:flex-row">
            {searching ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex w-full gap-[11px] rounded-[10px] border-0 p-[12px_10px] animate-pulse max-[800px]:min-w-[155px]">
                    <div className="h-[35px] w-[35px] shrink-0 rounded-[12px_12px_12px_4px] bg-[#31453e]"></div>
                    <div className="flex-1 space-y-[6px] py-[4px]">
                      <div className="h-[12px] w-[60%] rounded bg-[#31453e]"></div>
                      <div className="h-[10px] w-[40%] rounded bg-[#31453e]"></div>
                    </div>
                  </div>
                ))}
              </>
            ) : results.length ? results.map((user) => (
              <button className={`flex w-full gap-[11px] rounded-[10px] border-0 p-[12px_10px] text-left text-[#d3d9d2] ${groupMembers.some((member) => member.id === user.id) ? "bg-[#293732]" : "bg-transparent hover:bg-[#293732]"} max-[800px]:min-w-[155px]`} key={user.id} onClick={() => groupOpen ? toggleMember(user) : openDirect(user)}>
                <span className="grid h-[35px] w-[35px] shrink-0 place-items-center rounded-[12px_12px_12px_4px] bg-[#31453e] text-[12px] font-extrabold text-lime">{user.name.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0"><span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-extrabold">{user.name}</span><span className="mt-[4px] block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[#8c9991]">{groupOpen && groupMembers.some((member) => member.id === user.id) ? "Added to group" : (user.phone ?? "Start a conversation")}</span></span>
              </button>
            )) : <div className="p-[40px] text-center font-dmmono text-[11px] text-muted">No people found</div>}
          </div>
        )}

        {loadingConversations ? (
          <div className="flex flex-col gap-[6px] mx-[4px] animate-pulse max-[800px]:flex-row">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex w-full gap-[11px] rounded-[10px] bg-[#293732] p-[12px_10px] max-[800px]:min-w-[155px]">
                <div className="h-[35px] w-[35px] shrink-0 rounded-[12px_12px_12px_4px] bg-[#31453e]"></div>
                <div className="flex-1 space-y-[6px] py-[4px]">
                  <div className="h-[10px] w-[70%] rounded bg-[#31453e]"></div>
                  <div className="h-[8px] w-[40%] rounded bg-[#31453e]"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-[3px] overflow-auto max-[800px]:flex-row">
            {conversations.map((item) => {
              const isUnread = item.lastMessage && 
                item.lastMessage.senderId !== session.user.id && 
                new Date(item.lastMessage.createdAt).getTime() > (readTimestamps[item.id] || 0);
                
              return (
                <button className={`flex w-full items-center gap-[11px] rounded-[10px] border-0 p-[12px_10px] text-left text-[#d3d9d2] ${active?.id === item.id ? "bg-[#293732]" : "bg-transparent hover:bg-[#293732]"} max-[800px]:min-w-[155px]`} key={item.id} onClick={() => { shouldStickToBottom.current = true; handleSetActive(item); }}>
                  <span className="grid h-[35px] w-[35px] shrink-0 place-items-center rounded-[12px_12px_12px_4px] bg-[#31453e] text-[12px] font-extrabold text-lime relative">
                    {item.type === "group" ? <Users size={15} /> : item.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1"><span className={`block overflow-hidden text-ellipsis whitespace-nowrap text-[12px] ${isUnread ? "font-extrabold text-lime" : "font-bold"}`}>{item.name}</span><span className={`mt-[4px] block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] ${isUnread ? "text-cream font-bold" : "text-[#8c9991]"}`}>{item.lastMessage?.text ?? "No messages yet"}</span></span>
                  {item.unreadCount ? (
                    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-lime px-[5px] text-[10px] font-bold text-ink shrink-0 shadow-[0_0_0_3px_var(--tw-colors-ink)]">{item.unreadCount}</span>
                  ) : isUnread ? (
                    <span className="h-[8px] w-[8px] rounded-full bg-lime shadow-[0_0_0_3px_var(--tw-colors-ink)] shrink-0"></span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-auto flex items-center gap-[10px] border-t border-[#35423d] p-[15px_10px_5px] max-[800px]:hidden">
          <span className="grid h-[35px] w-[35px] shrink-0 place-items-center rounded-[12px_12px_12px_4px] bg-[#31453e] text-[12px] font-extrabold text-lime">{session.user.name.slice(0, 1).toUpperCase()}</span>
          <span><b onClick={() => setProfileOpen(true)} className="cursor-pointer hover:underline">{session.user.name}</b><small onClick={logout} style={{ cursor: "pointer" }} className="mt-[3px] block text-[10px] text-[#8c9991] hover:text-white">Sign out</small></span>
        </div>
      </aside>

      <section className="flex min-w-0 flex-col h-full overflow-hidden">
        <header className="flex min-h-[82px] items-center justify-between border-b border-line p-[16px_34px] max-[800px]:p-[15px_18px]">
          {active ? (
            <div className="flex items-center gap-[13px]"><span className="grid h-[35px] w-[35px] shrink-0 place-items-center rounded-[12px_12px_12px_4px] bg-[#31453e] text-[12px] font-extrabold text-lime">{active.type === "group" ? <Users size={15} /> : active.name.slice(0, 1).toUpperCase()}</span><div><h1 className="m-0 max-w-none text-[18px] tracking-[-0.04em]">{active.name}</h1><p className="mt-[4px] mb-0 text-[11px] text-muted">{active.type === "group" ? <button onClick={() => setShowParticipants((prev) => !prev)} className="hover:text-ink underline decoration-dashed underline-offset-[3px]">{active.participants.length || "Several"} participants</button> : "Direct conversation"}</p></div></div>
          ) : (
            <div className="flex items-center gap-[13px]"><span className="grid h-[35px] w-[35px] shrink-0 place-items-center rounded-[12px_12px_12px_4px] bg-[#31453e] text-[12px] font-extrabold text-lime"><MessageCircle size={15} /></span><div><h1 className="m-0 max-w-none text-[18px] tracking-[-0.04em]">Your workspace</h1><p className="mt-[4px] mb-0 text-[11px] text-muted">Select a conversation to begin</p></div></div>
          )}
          <div className="flex items-center gap-[7px] font-dmmono text-[10px] uppercase text-teal"><span className="h-[6px] w-[6px] rounded-full bg-[#62bc78] shadow-[0_0_0_4px_#e1f2e2]" /> live updates</div>
        </header>

        {showParticipants && active && active.type === "group" && (
          <div className="border-b border-line bg-[#f9faf7] p-[12px_34px] text-[12px] max-[800px]:p-[12px_18px]">
            <h3 className="mb-[8px] font-dmmono text-[10px] uppercase tracking-[0.1em] text-muted">Group Members ({active.participants.length})</h3>
            <ul className="flex flex-wrap gap-[8px]">
              {active.participants.map((p) => (
                <li key={p.id} className="flex items-center gap-[6px] rounded-[6px] border border-[#dfe2da] bg-white p-[4px_8px] shadow-sm">
                  <span className="grid h-[18px] w-[18px] place-items-center rounded-[4px] bg-[#31453e] text-[9px] font-extrabold text-lime">{p.name.slice(0, 1).toUpperCase()}</span>
                  <span>{p.name} {p.id === session?.user.id && "(You)"}</span>
                  {activeAdminIds.includes(p.id) && <Crown size={11} className="text-[#d9a05b]" aria-label="Admin" />}
                  {p.id !== session?.user.id && (
                    <button onClick={() => openDirect(p)} className="ml-[4px] text-[#8c9891] hover:text-teal transition-colors" title="Message" disabled={busy}><MessageCircle size={13} /></button>
                  )}
                  {isAdmin && p.id !== session?.user.id && (
                    <div className="flex items-center ml-[4px] border-l border-[#dfe2da] pl-[8px] gap-[6px]">
                      {!activeAdminIds.includes(p.id) && (
                        <button onClick={() => promoteToAdmin(p)} disabled={busy} className="text-[#8c9891] hover:text-ink text-[10px] font-bold" title="Promote to Admin">Promote</button>
                      )}
                      <button onClick={() => removeFromGroup(p)} disabled={busy} className="text-[#eab0a4] hover:text-[#9f3f31] text-[12px] font-bold" title="Remove from Group">&times;</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {isAdmin && (
              <div className="mt-[15px] pt-[15px] border-t border-[#dfe2da]">
                <h3 className="mb-[8px] font-dmmono text-[10px] uppercase tracking-[0.1em] text-muted">Add New Member</h3>
                <div className="relative max-w-[300px]">
                  <input value={addMemberQuery} onChange={e => setAddMemberQuery(e.target.value)} placeholder="Search by name or phone..." className="w-full rounded-[6px] border border-[#dfe2da] bg-white px-[10px] py-[6px] text-[12px] outline-none focus:border-lime" />
                  {addMemberQuery && (
                    <div className="absolute top-full left-0 right-0 mt-[4px] max-h-[150px] overflow-auto bg-white border border-[#dfe2da] rounded-[6px] shadow-lg z-10">
                      {addingMember ? <div className="p-[8px] text-center text-[10px] text-muted animate-pulse">Searching...</div> :
                        addMemberResults.length ? addMemberResults.map(u => (
                          <button type="button" key={u.id} onClick={() => { addToGroup(u); setAddMemberQuery(""); }} disabled={busy || active.participants.some(p => p.id === u.id)} className="w-full text-left p-[8px_10px] hover:bg-[#f9faf7] text-[11px] border-b border-[#dfe2da] last:border-0 flex justify-between items-center disabled:opacity-50">
                            <span>{u.name} {active.participants.some(p => p.id === u.id) && "(Already in group)"}</span>
                            {!active.participants.some(p => p.id === u.id) && <span className="text-[#62bc78] font-bold">+ Add</span>}
                          </button>
                        )) : <div className="p-[8px] text-center text-[10px] text-muted">No users found</div>
                      }
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {error && <div className="mt-[15px] mx-[25px] p-[12px_15px] border border-[#f3b8ad] rounded-[9px] text-[#9a392c] bg-[#fff1ee] text-[12px]">{error}</div>}

        {active && isGroup && (
          <div className="flex flex-wrap gap-[10px] border-b border-line bg-[#f2f3ee] p-[12px_20px]">
            {isAdmin && (
              <form onSubmit={renameGroup} className="flex items-center gap-[8px]"><input placeholder="Rename group" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} disabled={busy} className="h-[32px] rounded-[8px] border border-[#c8cec2] bg-white px-[10px] text-[12px]" /><button type="submit" className="inline-flex h-[32px] items-center gap-[6px] rounded-[8px] border border-[#bcc5b8] bg-white px-[10px] text-[11px] font-bold text-ink" disabled={!renameValue.trim() || busy}>Rename</button></form>
            )}
            <button className="inline-flex h-[32px] items-center gap-[6px] rounded-[8px] border border-[#eab0a4] bg-[#fff4f1] px-[10px] text-[11px] font-bold text-[#9f3f31]" onClick={leaveGroup} disabled={busy}>Leave group</button>
          </div>
        )}

        <div className="relative flex-1 overflow-auto p-[30px_clamp(20px,8vw,130px)] max-[800px]:px-[18px]" onScroll={(event) => { const element = event.currentTarget; shouldStickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; }}>
          {!active ? (
            <div className="m-auto text-center text-muted"><strong className="mb-[8px] block text-[18px] text-ink">A quiet inbox, for now.</strong>Search for someone to start a new thread.</div>
          ) : loading ? (
            <div className="p-[40px] flex flex-col gap-[25px] animate-pulse">
              <div className="flex gap-[15px]"><div className="h-[40px] w-[40px] rounded-[12px_12px_12px_4px] bg-[#edf0e8]"></div><div className="flex-1 space-y-[8px] py-[5px]"><div className="h-[12px] w-[40%] max-w-[200px] bg-[#edf0e8] rounded"></div><div className="h-[12px] w-[60%] max-w-[300px] bg-[#edf0e8] rounded"></div></div></div>
              <div className="flex gap-[15px] flex-row-reverse"><div className="flex-1 space-y-[8px] py-[5px] flex flex-col items-end"><div className="h-[12px] w-[30%] max-w-[150px] bg-[#edf0e8] rounded"></div><div className="h-[12px] w-[50%] max-w-[250px] bg-[#edf0e8] rounded"></div></div></div>
              <div className="flex gap-[15px]"><div className="h-[40px] w-[40px] rounded-[12px_12px_12px_4px] bg-[#edf0e8]"></div><div className="flex-1 space-y-[8px] py-[5px]"><div className="h-[12px] w-[70%] max-w-[350px] bg-[#edf0e8] rounded"></div></div></div>
            </div>
          ) : messages.length ? (
            <>
              {messages.map((message) => {
                const own = message.senderId === session.user.id || message.senderId === "me";
                let senderName = message.sender?.name;
                if (!senderName) {
                  const participant = active.participants.find(p => p.id === message.senderId);
                  if (participant) senderName = participant.name;
                }
                
                return (
                  <div className={`my-[15px] flex ${own ? "justify-end" : ""}`} key={message.id}>
                    <div className="relative group flex items-center max-w-[min(560px,78%)]">
                      {own && (
                        <div className="absolute right-[100%] mr-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-lg p-1 border border-line whitespace-nowrap">
                          <button className="p-1 hover:bg-cream rounded text-[#8c9891] hover:text-ink transition-colors" aria-label="Reply" title="Reply"><Reply size={14} /></button>
                          <button className="p-1 hover:bg-cream rounded text-[#8c9891] hover:text-ink transition-colors" aria-label="React" title="React"><SmilePlus size={14} /></button>
                        </div>
                      )}
                      
                      <article className={`rounded-[4px_16px_16px_16px] bg-[#edf0e8] p-[13px_16px] w-full ${own ? "rounded-[16px_4px_16px_16px] bg-teal text-white" : ""}`}>
                        {!own && <div className="mb-[5px] text-[10px] font-extrabold text-teal">{senderName ?? active.name}</div>}
                        <div className="text-[13px] leading-[1.55]">{message.text}</div>
                        <div className={`mt-[7px] font-dmmono text-[9px] ${own ? "text-[#b9d6ce]" : "text-[#8c9891]"}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </article>

                      {!own && (
                        <div className="absolute left-[100%] ml-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-lg p-1 border border-line whitespace-nowrap z-10">
                          <button className="p-1 hover:bg-cream rounded text-[#8c9891] hover:text-ink transition-colors" aria-label="Reply" title="Reply"><Reply size={14} /></button>
                          <button className="p-1 hover:bg-cream rounded text-[#8c9891] hover:text-ink transition-colors" aria-label="React" title="React"><SmilePlus size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </>
          ) : (
            <div className="m-auto text-center text-muted"><strong className="mb-[8px] block text-[18px] text-ink">This is the beginning.</strong>Send the first message and make it count.</div>
          )}
        </div>

        <div className="border-t border-line p-[18px_clamp(20px,8vw,130px)_24px] max-[800px]:px-[18px] relative bg-cream" ref={emojiPickerRef}>
          {showEmojiPicker && (
            <div className="absolute bottom-[calc(100%-10px)] right-[clamp(20px,8vw,130px)] z-50 max-[800px]:right-[18px] shadow-2xl rounded-lg">
              <EmojiPicker onEmojiClick={(emojiData) => { setText((prev) => prev + emojiData.emoji); setShowEmojiPicker(false); }} />
            </div>
          )}
          <form className="flex items-end gap-[10px] rounded-[15px] border border-line bg-white p-[8px_8px_8px_15px]" onSubmit={send}>
            <button type="button" className="mb-[8px] text-[#8c9991] hover:text-lime transition-colors shrink-0" onClick={() => setShowEmojiPicker(prev => !prev)} aria-label="Choose emoji"><Smile size={20} /></button>
            <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(event); } }} placeholder={active ? "Write a message..." : "Choose a conversation first"} disabled={!active || busy} rows={1} className="max-h-[110px] min-h-[35px] flex-1 resize-none border-0 bg-transparent text-[13px] text-ink outline-none py-[8px]" />
            <button className="grid h-[38px] w-[38px] place-items-center rounded-[11px] border-0 bg-ink text-lime shrink-0" type="submit" disabled={!active || !text.trim() || busy} aria-label="Send message"><Send size={16} /></button>
          </form>
        </div>
      </section>

      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-[min(400px,100%)] rounded-[16px] bg-cream p-[30px] shadow-xl">
            <div className="mb-[20px] flex items-center justify-between">
              <h2 className="text-[20px] font-extrabold text-ink tracking-[-0.03em]">My Profile</h2>
              <button onClick={() => setProfileOpen(false)} className="text-[24px] text-muted hover:text-ink">&times;</button>
            </div>
            <div className="flex flex-col items-center gap-[15px] mb-[30px]">
              <span className="grid h-[80px] w-[80px] place-items-center rounded-[24px_24px_24px_8px] bg-teal text-[32px] font-extrabold text-cream">{session.user.name.slice(0, 1).toUpperCase()}</span>
              <div className="text-center">
                <div className="text-[22px] font-bold text-ink tracking-[-0.04em]">{session.user.name}</div>
                <div className="text-[14px] text-muted font-dmmono">{session.user.phone ?? "No phone number"}</div>
              </div>
            </div>
            <div className="rounded-[8px] bg-[#eef0eb] p-[15px] text-[12px] text-muted font-dmmono">
              <div className="mb-[4px] uppercase tracking-[0.1em] text-[9px]">User ID</div>
              <div className="break-all">{session.user.id}</div>
            </div>
            <button onClick={() => setProfileOpen(false)} className="mt-[20px] w-full rounded-[8px] bg-lime py-[12px] text-[13px] font-extrabold text-ink hover:opacity-90">Close</button>
          </div>
        </div>
      )}
    </main>
  );
}
