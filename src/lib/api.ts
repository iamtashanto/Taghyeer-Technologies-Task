export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://frontend-task-chatapp.onrender.com/api";
export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ??
  "https://frontend-task-chatapp.onrender.com";

export type User = {
  id: string;
  name: string;
  phone?: string;
  avatar?: string;
};
export type Conversation = {
  id: string;
  name: string;
  type: "direct" | "group";
  participants: User[];
  admins?: string[];
  lastMessage?: Message;
  unreadCount?: number;
};
export type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
  sender?: User;
};

type Json = Record<string, unknown> | unknown[];

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      (body as { detail?: string; message?: string })?.detail ??
        (body as { message?: string })?.message ??
        `Request failed (${response.status})`,
    );
  return body as T;
}

/**
 * Unwraps common API envelope keys.
 * Tries: data, items, results, conversations, messages, users
 * Falls back to the raw value if none match.
 */
function unwrap<T>(value: Json | null): T {
  if (value && !Array.isArray(value) && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of [
      "data",
      "items",
      "results",
      "conversations",
      "messages",
      "users",
    ]) {
      if (key in record) return record[key] as T;
    }
  }
  return value as T;
}

/** Normalizes any user-shaped object from the API into a User. */
export function normalizeUser(value: unknown): User {
  if (!value || typeof value !== "object") {
    return { id: "", name: "Unknown user" };
  }
  // Unwrap common envelopes: { data: {...} } or { user: {...} }
  const raw = value as Record<string, unknown>;
  const item = (
    raw.data && typeof raw.data === "object"
      ? raw.data
      : raw.user && typeof raw.user === "object"
        ? raw.user
        : raw
  ) as Record<string, unknown>;

  const id = String(item.id ?? item._id ?? item.userId ?? "");
  const name = String(item.name ?? item.fullName ?? item.username ?? "Unknown user");
  const phone = String(item.phone ?? item.phoneNumber ?? "") || undefined;
  const avatar = String(item.avatar ?? item.avatarUrl ?? "") || undefined;
  return { id, name, phone, avatar };
}

/** Normalizes any message-shaped object from the API into a Message. */
export function normalizeMessage(value: unknown): Message {
  if (!value || typeof value !== "object") {
    return {
      id: crypto.randomUUID(),
      text: "",
      senderId: "",
      createdAt: new Date().toISOString(),
    };
  }
  const item = value as Record<string, unknown>;

  // Resolve sender object vs string id
  const senderRaw = item.sender;
  const senderObj =
    senderRaw && typeof senderRaw === "object" ? senderRaw : undefined;

  const senderId = String(
    item.senderId ??
      item.sender_id ??
      (typeof senderRaw === "string" ? senderRaw : undefined) ??
      (senderObj as Record<string, unknown> | undefined)?.id ??
      (senderObj as Record<string, unknown> | undefined)?._id ??
      "",
  );

  return {
    id: String(item.id ?? item._id ?? crypto.randomUUID()),
    text: String(item.text ?? item.content ?? item.message ?? ""),
    senderId,
    createdAt: String(
      item.createdAt ??
        item.created_at ??
        item.timestamp ??
        new Date().toISOString(),
    ),
    sender: senderObj ? normalizeUser(senderObj) : undefined,
  };
}

/**
 * Normalizes a conversation object from the API.
 * Handles both direct and group conversations.
 * For direct conversations, derives the name from the other participant
 * if the API does not provide a name field.
 */
export function normalizeConversation(value: unknown, currentUserId?: string): Conversation {
  if (!value || typeof value !== "object") {
    return { id: "", name: "Conversation", type: "direct", participants: [] };
  }
  const item = value as Record<string, unknown>;

  // Participants: try participants, members, users arrays
  const participantValues: unknown[] = Array.isArray(item.participants)
    ? item.participants
    : Array.isArray(item.members)
      ? item.members
      : Array.isArray(item.users)
        ? item.users
        : [];

  const participants = participantValues.map(normalizeUser);

  // Admins: array of user objects or plain ids
  const adminValues: unknown[] = Array.isArray(item.admins)
    ? item.admins
    : Array.isArray(item.adminIds)
      ? item.adminIds
      : [];
  const admins = adminValues.map((admin) => {
    if (typeof admin === "string") return admin;
    if (admin && typeof admin === "object") {
      const a = admin as Record<string, unknown>;
      return String(a.id ?? a._id ?? "");
    }
    return String(admin);
  });

  const isGroup = item.type === "group" || item.isGroup === true;
  const type: "direct" | "group" = isGroup ? "group" : "direct";

  // Name resolution:
  // 1. Explicit name/title field (always used for groups)
  // 2. otherUserName from API
  // 3. For direct: find the other participant who isn't the current user
  // 4. Fall back to first participant name
  let name = String(item.name ?? item.title ?? item.otherUserName ?? "");
  if (!name && !isGroup) {
    const other =
      currentUserId
        ? participants.find((p) => p.id !== currentUserId)
        : participants[1] ?? participants[0];
    name = other?.name ?? "";
  }
  if (!name) name = participants[0]?.name ?? "Conversation";

  const last = item.lastMessage ?? item.last_message;

  return {
    id: String(item.id ?? item._id ?? ""),
    name,
    type,
    participants,
    admins,
    lastMessage: last ? normalizeMessage(last) : undefined,
    unreadCount: Number(item.unreadCount ?? item.unread_count ?? 0),
  };
}

export const api = {
  /** POST /auth/login — Log in or register. Returns token + user. */
  login: async (payload: { phone: string; name: string }) => {
    const result = await request<Json>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(payload) },
    );
    // API may return { token, user } directly or wrapped in { data: ... }
    const unwrapped = unwrap<{ token?: string; accessToken?: string; user?: unknown }>(result);
    return unwrapped as { token?: string; accessToken?: string; user?: unknown };
  },

  /** GET /auth/me — Returns the current authenticated user. */
  me: async (token: string) => {
    const result = await request<Json>("/auth/me", {}, token);
    return unwrap<unknown>(result);
  },

  /** GET /users/search?q= — Search users by name or phone. */
  searchUsers: async (query: string, token: string) => {
    const result = await request<Json>(
      `/users/search?q=${encodeURIComponent(query)}`,
      {},
      token,
    );
    const values = unwrap<unknown[]>(result);
    return (Array.isArray(values) ? values : []).map(normalizeUser);
  },

  /** GET /conversations — List all conversations for the current user. */
  conversations: async (token: string, currentUserId?: string) => {
    const result = await request<Json>("/conversations", {}, token);
    const values = unwrap<unknown[]>(result);
    return (Array.isArray(values) ? values : []).map((c) =>
      normalizeConversation(c, currentUserId),
    );
  },

  /** POST /conversations — Start a direct conversation with a user. */
  startConversation: async (userId: string, token: string, currentUserId?: string) => {
    const result = await request<Json>(
      "/conversations",
      { method: "POST", body: JSON.stringify({ userId }) },
      token,
    );
    return normalizeConversation(unwrap<unknown>(result), currentUserId);
  },

  /** GET /conversations/:id/messages — Get message history for a conversation. */
  messages: async (conversationId: string, token: string) => {
    const result = await request<Json>(
      `/conversations/${conversationId}/messages?limit=50`,
      {},
      token,
    );
    const values = unwrap<unknown[]>(result);
    return (Array.isArray(values) ? values : []).map(normalizeMessage);
  },

  /** POST /messages — Send a message. */
  sendMessage: async (conversationId: string, text: string, token: string) => {
    const result = await request<Json>(
      "/messages",
      { method: "POST", body: JSON.stringify({ conversationId, text }) },
      token,
    );
    return normalizeMessage(unwrap<unknown>(result));
  },

  /** POST /conversations/group — Create a group conversation. */
  createGroup: async (name: string, participantIds: string[], token: string, currentUserId?: string) => {
    const result = await request<Json>(
      "/conversations/group",
      { method: "POST", body: JSON.stringify({ name, participantIds }) },
      token,
    );
    return normalizeConversation(unwrap<unknown>(result), currentUserId);
  },

  /** POST /conversations/:id/participants — Add members to a group (admins only). */
  addParticipants: (conversationId: string, userIds: string[], token: string) =>
    request<unknown>(
      `/conversations/${conversationId}/participants`,
      { method: "POST", body: JSON.stringify({ userIds }) },
      token,
    ),

  /** DELETE /conversations/:id/participants/:userId — Remove a member / leave a group. */
  removeParticipant: (conversationId: string, userId: string, token: string) =>
    request<unknown>(
      `/conversations/${conversationId}/participants/${userId}`,
      { method: "DELETE" },
      token,
    ),

  /** POST /conversations/:id/admins — Promote a member to admin (admins only). */
  promoteAdmin: (conversationId: string, userId: string, token: string) =>
    request<unknown>(
      `/conversations/${conversationId}/admins`,
      { method: "POST", body: JSON.stringify({ userId }) },
      token,
    ),

  /** PATCH /conversations/:id — Rename a group (admins only). */
  renameGroup: (conversationId: string, name: string, token: string) =>
    request<unknown>(
      `/conversations/${conversationId}`,
      { method: "PATCH", body: JSON.stringify({ name }) },
      token,
    ),

  /** GET /health — Health check (no auth required). */
  health: () => request<unknown>("/health"),
};
