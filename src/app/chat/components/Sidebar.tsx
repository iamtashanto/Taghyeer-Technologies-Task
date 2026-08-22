import React, { FormEvent, RefObject } from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { Conversation, User } from "@/lib/api";

type Session = { token: string; user: User };

interface SidebarProps {
  session: Session | null;
  conversations: Conversation[];
  active: Conversation | null;
  groupOpen: boolean;
  setGroupOpen: React.Dispatch<React.SetStateAction<boolean>>;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  groupName: string;
  setGroupName: React.Dispatch<React.SetStateAction<string>>;
  groupMembers: User[];
  setGroupMembers: React.Dispatch<React.SetStateAction<User[]>>;
  toggleMember: (user: User) => void;
  createGroup: (event: FormEvent) => void;
  searching: boolean;
  results: User[];
  openDirect: (user: User) => void;
  loadingConversations: boolean;
  readTimestamps: Record<string, number>;
  shouldStickToBottom: React.MutableRefObject<boolean>;
  setShowScrollButton: React.Dispatch<React.SetStateAction<boolean>>;
  handleSetActive: (item: Conversation | null) => void;
  setProfileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  logout: () => void;
}

export function Sidebar({
  session, conversations, active, groupOpen, setGroupOpen, query, setQuery,
  groupName, setGroupName, groupMembers, setGroupMembers, toggleMember, createGroup,
  searching, results, openDirect, loadingConversations, readTimestamps,
  shouldStickToBottom, setShowScrollButton, handleSetActive, setProfileOpen, logout
}: SidebarProps) {
  if (!session) return null;

  return (
    <aside className="flex flex-col bg-ink px-[18px] pt-[25px] pb-[25px] text-cream max-[800px]:min-h-0 max-[800px]:p-[17px]">
      <Link className="mx-[10px] mb-[42px] flex items-center max-[800px]:mb-[20px]" href="/">
        <img src="/logo.png" alt="Relay Logo" className="h-[31px] w-auto object-contain" />
      </Link>

      <div className="mx-[10px] mb-[14px] flex items-center justify-between font-dmmono text-[10px] uppercase tracking-[0.1em] text-[#77847d] max-[800px]:hidden">
        Conversations
        <button className="grid h-[25px] w-[25px] place-items-center rounded-[7px] border border-[#405049] bg-transparent text-lime" onClick={() => { setGroupOpen((open) => !open); setQuery(""); }} aria-label="Create group">
          <Plus size={14} />
        </button>
      </div>

      {!groupOpen && (
        <div className="mx-[4px] mb-[20px] flex items-center gap-[8px] rounded-[9px] border border-[#3b4842] p-[10px_12px] text-[#87928a] max-[800px]:hidden">
          <Search size={14} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find someone..." className="w-full border-0 bg-transparent text-[12px] text-cream outline-none" />
        </div>
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

          <button className="mt-[6px] w-full items-center justify-center rounded-[8px] bg-lime p-[10px] text-[12px] font-extrabold text-ink transition-opacity hover:opacity-90 disabled:opacity-50" disabled={!groupName.trim() || groupMembers.length === 0}>Create group</button>
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
          {[...conversations]
            .sort((a, b) => {
              const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
              const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
              return bTime - aTime;
            })
            .map((item) => {
              const isUnread = item.lastMessage &&
                item.lastMessage.senderId !== session.user.id &&
                new Date(item.lastMessage.createdAt).getTime() > (readTimestamps[item.id] || 0);

              return (
                <button className={`flex w-full items-center gap-[11px] rounded-[10px] border-0 p-[12px_10px] text-left text-[#d3d9d2] ${active?.id === item.id ? "bg-[#293732]" : "bg-transparent hover:bg-[#293732]"} max-[800px]:min-w-[155px]`} key={item.id} onClick={() => { shouldStickToBottom.current = true; setShowScrollButton(false); handleSetActive(item); }}>
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
        <span>
          <b onClick={() => setProfileOpen(true)} className="cursor-pointer hover:underline">{session.user.name}</b>
          <small onClick={logout} style={{ cursor: "pointer" }} className="mt-[3px] block text-[10px] text-[#8c9991] hover:text-white">Sign out</small>
        </span>
      </div>
    </aside>
  );
}
