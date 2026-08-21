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

function unwrap<T>(value: Json): T {
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

export function normalizeUser(value: unknown): User {
  const item = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(item.id ?? item._id ?? item.userId ?? ""),
    name: String(item.name ?? item.fullName ?? "Unknown user"),
    phone: String(item.phone ?? item.phoneNumber ?? "") || undefined,
    avatar: String(item.avatar ?? item.avatarUrl ?? "") || undefined,
  };
}

export function normalizeMessage(value: unknown): Message {
  const item = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(item.id ?? item._id ?? crypto.randomUUID()),
    text: String(item.text ?? item.content ?? item.message ?? ""),
    senderId: String(
      item.senderId ??
        item.sender_id ??
        (item.sender as Record<string, unknown> | undefined)?.id ??
        "",
    ),
    createdAt: String(
      item.createdAt ??
        item.created_at ??
        item.timestamp ??
        new Date().toISOString(),
    ),
    sender: item.sender ? normalizeUser(item.sender) : undefined,
  };
}

export function normalizeConversation(value: unknown): Conversation {
  const item = (value ?? {}) as Record<string, unknown>;
  const participantValues = Array.isArray(item.participants)
    ? item.participants
    : Array.isArray(item.members)
      ? item.members
      : [];
  const adminValues = Array.isArray(item.admins)
    ? item.admins
    : Array.isArray(item.adminIds)
      ? item.adminIds
      : [];
  const last = item.lastMessage ?? item.last_message;
  return {
    id: String(item.id ?? item._id ?? ""),
    name: String(
      item.name ?? item.title ?? item.otherUserName ?? "Conversation",
    ),
    type: item.type === "group" || item.isGroup === true ? "group" : "direct",
    participants: participantValues.map(normalizeUser),
    admins: adminValues.map((admin) =>
      String((admin as Record<string, unknown>)?.id ?? admin),
    ),
    lastMessage: last ? normalizeMessage(last) : undefined,
    unreadCount: Number(item.unreadCount ?? item.unread_count ?? 0),
  };
}

export const api = {
  login: (payload: { phone: string; name: string }) =>
    request<{ token?: string; accessToken?: string; user?: unknown }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(payload) },
    ),
  me: (token: string) => request<unknown>("/auth/me", {}, token),
  searchUsers: async (query: string, token: string) => {
    const result = await request<Json>(
      `/users/search?q=${encodeURIComponent(query)}`,
      {},
      token,
    );
    const values = unwrap<unknown[]>(result);
    return (Array.isArray(values) ? values : []).map(normalizeUser);
  },
  conversations: async (token: string) => {
    const result = await request<Json>("/conversations", {}, token);
    const values = unwrap<unknown[]>(result);
    return (Array.isArray(values) ? values : []).map(normalizeConversation);
  },
  startConversation: (userId: string, token: string) =>
    request<unknown>(
      "/conversations",
      { method: "POST", body: JSON.stringify({ userId }) },
      token,
    ),
  messages: async (conversationId: string, token: string) => {
    const result = await request<Json>(
      `/conversations/${conversationId}/messages?limit=50`,
      {},
      token,
    );
    const values = unwrap<unknown[]>(result);
    return (Array.isArray(values) ? values : []).map(normalizeMessage);
  },
  sendMessage: (conversationId: string, text: string, token: string) =>
    request<unknown>(
      "/messages",
      { method: "POST", body: JSON.stringify({ conversationId, text }) },
      token,
    ),
  createGroup: (name: string, participantIds: string[], token: string) =>
    request<unknown>(
      "/conversations/group",
      { method: "POST", body: JSON.stringify({ name, participantIds }) },
      token,
    ),
  addParticipants: (conversationId: string, userIds: string[], token: string) =>
    request<unknown>(
      `/conversations/${conversationId}/participants`,
      { method: "POST", body: JSON.stringify({ userIds }) },
      token,
    ),
  removeParticipant: (conversationId: string, userId: string, token: string) =>
    request<unknown>(
      `/conversations/${conversationId}/participants/${userId}`,
      { method: "DELETE" },
      token,
    ),
  promoteAdmin: (conversationId: string, userId: string, token: string) =>
    request<unknown>(
      `/conversations/${conversationId}/admins`,
      { method: "POST", body: JSON.stringify({ userId }) },
      token,
    ),
  renameGroup: (conversationId: string, name: string, token: string) =>
    request<unknown>(
      `/conversations/${conversationId}`,
      { method: "PATCH", body: JSON.stringify({ name }) },
      token,
    ),
  health: () => request<unknown>("/health"),
};
