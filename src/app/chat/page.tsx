"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api, Conversation, Message, normalizeConversation, normalizeMessage, normalizeUser, SOCKET_URL, User } from "@/lib/api";
import { Sidebar } from "./components/Sidebar";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";
import { ProfileModal } from "./components/ProfileModal";

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
  const [renameValue, setRenameValue] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);

  const [addMemberQuery, setAddMemberQuery] = useState("");
  const [addMemberResults, setAddMemberResults] = useState<User[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [readTimestamps, setReadTimestamps] = useState<Record<string, number>>({});

  const endRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottom = useRef(true);
  const socketRef = useRef<import("socket.io-client").Socket | null>(null);
  const activeIdRef = useRef<string | undefined>(active?.id);
  const [showScrollButton, setShowScrollButton] = useState(false);

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
      <Sidebar
        session={session}
        conversations={conversations}
        active={active}
        groupOpen={groupOpen}
        setGroupOpen={setGroupOpen}
        query={query}
        setQuery={setQuery}
        groupName={groupName}
        setGroupName={setGroupName}
        groupMembers={groupMembers}
        setGroupMembers={setGroupMembers}
        toggleMember={toggleMember}
        createGroup={createGroup}
        searching={searching}
        results={results}
        openDirect={openDirect}
        loadingConversations={loadingConversations}
        readTimestamps={readTimestamps}
        shouldStickToBottom={shouldStickToBottom}
        setShowScrollButton={setShowScrollButton}
        handleSetActive={handleSetActive}
        setProfileOpen={setProfileOpen}
        logout={logout}
      />

      <section className="flex min-w-0 flex-col h-full overflow-hidden">
        <ChatHeader
          session={session}
          active={active}
          busy={busy}
          isAdmin={isAdmin}
          activeAdminIds={activeAdminIds}
          showParticipants={showParticipants}
          setShowParticipants={setShowParticipants}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          renameGroup={renameGroup}
          leaveGroup={leaveGroup}
          addToGroup={addToGroup}
          removeFromGroup={removeFromGroup}
          promoteToAdmin={promoteToAdmin}
          addMemberQuery={addMemberQuery}
          setAddMemberQuery={setAddMemberQuery}
          addMemberResults={addMemberResults}
          addingMember={addingMember}
        />

        <MessageList
          active={active}
          messages={messages}
          session={session}
          loading={loading}
          error={error}
          shouldStickToBottom={shouldStickToBottom}
          showScrollButton={showScrollButton}
          setShowScrollButton={setShowScrollButton}
          endRef={endRef}
          scrollToBottom={() => {
            shouldStickToBottom.current = true;
            setShowScrollButton(false);
            endRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        <ChatInput
          active={active}
          busy={busy}
          text={text}
          setText={setText}
          onSend={send}
        />
      </section>

      {profileOpen && (
        <ProfileModal session={session} onClose={() => setProfileOpen(false)} />
      )}
    </main>
  );
}
