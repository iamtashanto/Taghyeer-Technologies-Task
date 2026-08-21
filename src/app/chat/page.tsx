"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Crown,
  MessageCircle,
  Plus,
  Search,
  Send,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import {
  api,
  Conversation,
  Message,
  normalizeConversation,
  normalizeMessage,
  normalizeUser,
  SOCKET_URL,
  User,
} from "@/lib/api";

type Session = { token: string; user: User };

export default function ChatPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [manageTarget, setManageTarget] = useState<User | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottom = useRef(true);
  const socketRef = useRef<import("socket.io-client").Socket | null>(null);
  const activeIdRef = useRef<string | undefined>(active?.id);

  const activeId = active?.id;
  const isGroup = active?.type === "group";
  const activeAdminIds = useMemo(() => active?.admins ?? [], [active]);
  const isAdmin = !!session && activeAdminIds.includes(session.user.id);

  async function refreshConversations(currentToken: string) {
    const next = await api.conversations(currentToken);
    setConversations(next);
    if (activeIdRef.current) {
      const latestActive = next.find((item) => item.id === activeIdRef.current);
      if (latestActive) setActive(latestActive);
    }
  }

  useEffect(() => {
    const stored = window.localStorage.getItem("relay-session");
    if (!stored) return;
    const parsed = JSON.parse(stored) as Session;
    api
      .me(parsed.token)
      .then((value) =>
        setSession({ token: parsed.token, user: normalizeUser(value) }),
      )
      .catch(() => window.localStorage.removeItem("relay-session"));
  }, []);

  useEffect(() => {
    if (!session) return;
    refreshConversations(session.token).catch((e: Error) =>
      setError(e.message),
    );
  }, [session]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (!session || !activeId) return;
    setLoading(true);
    api
      .messages(activeId, session.token)
      .then(setMessages)
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
      return;
    }
    const timer = window.setTimeout(
      () =>
        api
          .searchUsers(query.trim(), session.token)
          .then(setResults)
          .catch(() => setResults([])),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [query, session]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    import("socket.io-client").then(({ io }) => {
      if (cancelled) return;
      const socket = io(SOCKET_URL, {
        auth: { token: session.token },
        transports: ["websocket"],
      });
      socketRef.current = socket;

      socket.on("message:new", (payload: unknown) => {
        const item = payload as Record<string, unknown>;
        const conversationId = String(
          item.conversationId ?? item.conversation_id ?? "",
        );
        const next = normalizeMessage(payload);

        if (conversationId === activeIdRef.current) {
          setMessages((current) =>
            current.some((message) => message.id === next.id)
              ? current
              : [...current, next],
          );
        } else {
          refreshConversations(session.token).catch(() => undefined);
        }
      });

      socket.on("conversation:updated", () => {
        refreshConversations(session.token).catch(() => undefined);
      });
    });

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [session]);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (!phone.trim() || !name.trim())
      return setError("Phone number and name are required.");

    setBusy(true);
    setError("");

    try {
      const response = await api.login({
        phone: phone.trim(),
        name: name.trim(),
      });
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
      const created = await api.startConversation(user.id, session.token);
      const normalized = normalizeConversation(created);
      const next = normalized.id
        ? normalized
        : {
            id: user.id,
            name: user.name,
            type: "direct" as const,
            participants: [user],
          };
      setConversations((current) => [
        next,
        ...current.filter((item) => item.id !== next.id),
      ]);
      setActive(next);
      setQuery("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function toggleMember(user: User) {
    setGroupMembers((current) =>
      current.some((item) => item.id === user.id)
        ? current.filter((item) => item.id !== user.id)
        : [...current, user],
    );
  }

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    if (!session || !groupName.trim() || !groupMembers.length)
      return setError("Add at least one person and a group name.");

    setBusy(true);
    setError("");

    try {
      const created = await api.createGroup(
        groupName.trim(),
        groupMembers.map((item) => item.id),
        session.token,
      );
      const next = normalizeConversation(created);
      setConversations((current) => [next, ...current]);
      setActive(next);
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
    if (!session || !active || !isGroup || !isAdmin || !renameValue.trim())
      return;

    setBusy(true);
    setError("");

    try {
      await api.renameGroup(active.id, renameValue.trim(), session.token);
      await refreshConversations(session.token);
      setRenameValue("");
    } catch (e) {
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
      await refreshConversations(session.token);
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
      await refreshConversations(session.token);
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
      await refreshConversations(session.token);
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
      setActive(next[0] ?? null);
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

    const optimistic = normalizeMessage({
      id: crypto.randomUUID(),
      text: value,
      senderId: session.user.id,
      createdAt: new Date().toISOString(),
    });
    setMessages((current) => [...current, optimistic]);

    try {
      const sent = await api.sendMessage(active.id, value, session.token);
      setMessages((current) => [
        ...current.filter((item) => item.id !== optimistic.id),
        normalizeMessage(sent),
      ]);
    } catch (e) {
      setMessages((current) =>
        current.filter((item) => item.id !== optimistic.id),
      );
      setText(value);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    window.localStorage.removeItem("relay-session");
    setSession(null);
    setActive(null);
  }

  if (!session) {
    return (
      <main className="login-page">
        <form className="login-panel" onSubmit={login}>
          <Link className="logo" href="/">
            <span className="logo-mark">r/</span> relay
          </Link>
          <h1>Make room for a good conversation.</h1>
          <p>
            Sign in with your phone number. New numbers are registered
            automatically.
          </p>
          {error && <div className="error-banner">{error}</div>}

          <label className="form-field">
            Your name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ada Lovelace"
            />
          </label>

          <label className="form-field">
            Phone number
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+1 555 123 4567"
              type="tel"
            />
          </label>

          <button className="button-primary" disabled={busy}>
            {busy ? "Connecting..." : "Enter workspace"}{" "}
            <ArrowLeft size={16} style={{ transform: "rotate(180deg)" }} />
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="chat-shell">
      <aside className="sidebar">
        <Link className="logo" href="/">
          <span className="logo-mark">r/</span> relay
        </Link>

        <div className="sidebar-label group-heading">
          Conversations
          <button
            className="icon-button"
            onClick={() => setGroupOpen((open) => !open)}
            aria-label="Create group"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="search-box">
          <Search size={14} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find someone..."
          />
        </div>

        {groupOpen && (
          <form className="group-form" onSubmit={createGroup}>
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Group name"
            />
            <small>{groupMembers.length} selected</small>
            <button className="button-primary" disabled={busy}>
              Create group
            </button>
          </form>
        )}

        {query && (
          <div className="conversation-list">
            {results.length ? (
              results.map((user) => (
                <button
                  className={`conversation ${groupMembers.some((member) => member.id === user.id) ? "active" : ""}`}
                  key={user.id}
                  onClick={() =>
                    groupOpen ? toggleMember(user) : openDirect(user)
                  }
                >
                  <span className="avatar">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="conversation-copy">
                    <span className="conversation-name">{user.name}</span>
                    <span className="conversation-preview">
                      {groupOpen &&
                      groupMembers.some((member) => member.id === user.id)
                        ? "Added to group"
                        : (user.phone ?? "Start a conversation")}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <div className="loading">No people found</div>
            )}
          </div>
        )}

        <div className="conversation-list">
          {conversations.map((item) => (
            <button
              className={`conversation ${active?.id === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => {
                shouldStickToBottom.current = true;
                setActive(item);
              }}
            >
              <span className="avatar">
                {item.type === "group" ? (
                  <Users size={15} />
                ) : (
                  item.name.slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="conversation-copy">
                <span className="conversation-name">{item.name}</span>
                <span className="conversation-preview">
                  {item.lastMessage?.text ?? "No messages yet"}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="user-chip">
          <span className="avatar">
            {session.user.name.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <b>{session.user.name}</b>
            <small onClick={logout} style={{ cursor: "pointer" }}>
              Sign out
            </small>
          </span>
        </div>
      </aside>

      <section className="chat-main">
        <header className="chat-header">
          {active ? (
            <div className="chat-title">
              <span className="avatar">
                {active.type === "group" ? (
                  <Users size={15} />
                ) : (
                  active.name.slice(0, 1).toUpperCase()
                )}
              </span>
              <div>
                <h1>{active.name}</h1>
                <p>
                  {active.type === "group"
                    ? `${active.participants.length || "Several"} participants`
                    : "Direct conversation"}
                </p>
              </div>
            </div>
          ) : (
            <div className="chat-title">
              <span className="avatar">
                <MessageCircle size={15} />
              </span>
              <div>
                <h1>Your workspace</h1>
                <p>Select a conversation to begin</p>
              </div>
            </div>
          )}
          <div className="live-status">
            <span /> live updates
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {active && isGroup && (
          <div className="group-admin-strip">
            <form onSubmit={renameGroup} className="group-inline-form">
              <input
                placeholder="Rename group"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                disabled={!isAdmin || busy}
              />
              <button
                type="submit"
                className="mini-btn"
                disabled={!isAdmin || !renameValue.trim() || busy}
              >
                Rename
              </button>
            </form>

            {isAdmin && manageTarget && (
              <div className="group-actions">
                <button
                  className="mini-btn"
                  onClick={() => addToGroup(manageTarget)}
                  disabled={busy}
                >
                  <UserPlus size={12} /> Add
                </button>
                <button
                  className="mini-btn"
                  onClick={() => removeFromGroup(manageTarget)}
                  disabled={busy}
                >
                  <UserMinus size={12} /> Remove
                </button>
                <button
                  className="mini-btn"
                  onClick={() => promoteToAdmin(manageTarget)}
                  disabled={busy}
                >
                  <Crown size={12} /> Promote
                </button>
              </div>
            )}

            <button
              className="mini-btn danger"
              onClick={leaveGroup}
              disabled={busy}
            >
              Leave group
            </button>
          </div>
        )}

        <div
          className="messages"
          onScroll={(event) => {
            const element = event.currentTarget;
            shouldStickToBottom.current =
              element.scrollHeight - element.scrollTop - element.clientHeight <
              80;
          }}
        >
          {!active ? (
            <div className="empty-state">
              <strong>A quiet inbox, for now.</strong>Search for someone to
              start a new thread.
            </div>
          ) : loading ? (
            <div className="loading">Loading conversation...</div>
          ) : messages.length ? (
            <>
              {messages.map((message) => {
                const own =
                  message.senderId === session.user.id ||
                  message.senderId === "me";
                return (
                  <div
                    className={`message-row ${own ? "own" : ""}`}
                    key={message.id}
                    onClick={() =>
                      !own && message.sender && setManageTarget(message.sender)
                    }
                  >
                    <article className="message-bubble">
                      {!own && (
                        <div className="message-author">
                          {message.sender?.name ?? active.name}
                        </div>
                      )}
                      <div className="message-text">{message.text}</div>
                      <div className="message-time">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </article>
                  </div>
                );
              })}
              <div ref={endRef} />
            </>
          ) : (
            <div className="empty-state">
              <strong>This is the beginning.</strong>Send the first message and
              make it count.
            </div>
          )}
        </div>

        <div className="composer-wrap">
          <form className="composer" onSubmit={send}>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(event);
                }
              }}
              placeholder={
                active ? "Write a message..." : "Choose a conversation first"
              }
              disabled={!active || busy}
              rows={1}
            />
            <button
              className="send-button"
              type="submit"
              disabled={!active || !text.trim() || busy}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
