import React, { FormEvent } from "react";
import { MessageCircle, Users, Crown } from "lucide-react";
import { Conversation, User } from "@/lib/api";

type Session = { token: string; user: User };

interface ChatHeaderProps {
  session: Session | null;
  active: Conversation | null;
  busy: boolean;
  isAdmin: boolean;
  activeAdminIds: string[];
  showParticipants: boolean;
  setShowParticipants: React.Dispatch<React.SetStateAction<boolean>>;
  renameValue: string;
  setRenameValue: React.Dispatch<React.SetStateAction<string>>;
  renameGroup: (event: FormEvent) => void;
  leaveGroup: () => void;
  addToGroup: (user: User) => void;
  removeFromGroup: (user: User) => void;
  promoteToAdmin: (user: User) => void;
  addMemberQuery: string;
  setAddMemberQuery: React.Dispatch<React.SetStateAction<string>>;
  addMemberResults: User[];
  addingMember: boolean;
}

export function ChatHeader({
  session, active, busy, isAdmin, activeAdminIds, showParticipants, setShowParticipants,
  renameValue, setRenameValue, renameGroup, leaveGroup, addToGroup, removeFromGroup, promoteToAdmin,
  addMemberQuery, setAddMemberQuery, addMemberResults, addingMember
}: ChatHeaderProps) {
  const isGroup = active?.type === "group";

  return (
    <>
      <header className="flex min-h-[82px] items-center justify-between border-b border-line p-[16px_34px] max-[800px]:p-[15px_18px]">
        {active ? (
          <div className="flex items-center gap-[13px]">
            <span className="grid h-[35px] w-[35px] shrink-0 place-items-center rounded-[12px_12px_12px_4px] bg-[#31453e] text-[12px] font-extrabold text-lime">
              {active.type === "group" ? <Users size={15} /> : active.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h1 className="m-0 max-w-none text-[18px] tracking-[-0.04em]">{active.name}</h1>
              <p className="mt-[4px] mb-0 text-[11px] text-muted">
                {active.type === "group" ? (
                  <button onClick={() => setShowParticipants((prev) => !prev)} className="hover:text-ink underline decoration-dashed underline-offset-[3px]">
                    {active.participants.length || "Several"} participants
                  </button>
                ) : "Direct conversation"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-[13px]">
            <span className="grid h-[35px] w-[35px] shrink-0 place-items-center rounded-[12px_12px_12px_4px] bg-[#31453e] text-[12px] font-extrabold text-lime">
              <MessageCircle size={15} />
            </span>
            <div>
              <h1 className="m-0 max-w-none text-[18px] tracking-[-0.04em]">Your workspace</h1>
              <p className="mt-[4px] mb-0 text-[11px] text-muted">Select a conversation to begin</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-[7px] font-dmmono text-[10px] uppercase text-teal">
          <span className="h-[6px] w-[6px] rounded-full bg-[#62bc78] shadow-[0_0_0_4px_#e1f2e2]" /> live updates
        </div>
      </header>

      {showParticipants && active && isGroup && (
        <div className="border-b border-line bg-[#f9faf7] p-[12px_34px] text-[12px] max-[800px]:p-[12px_18px]">
          <h3 className="mb-[8px] font-dmmono text-[10px] uppercase tracking-[0.1em] text-muted">Group Members ({active.participants.length})</h3>
          <ul className="flex flex-wrap gap-[8px]">
            {active.participants.map((p) => (
              <li key={p.id} className="flex items-center gap-[6px] rounded-[6px] border border-[#dfe2da] bg-white p-[4px_8px] shadow-sm">
                <span className="grid h-[18px] w-[18px] place-items-center rounded-[4px] bg-[#31453e] text-[9px] font-extrabold text-lime">{p.name.slice(0, 1).toUpperCase()}</span>
                <span>{p.name} {p.id === session?.user.id && "(You)"}</span>
                {activeAdminIds.includes(p.id) && <Crown size={11} className="text-[#d9a05b]" aria-label="Admin" />}
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

      {active && isGroup && (
        <div className="flex flex-wrap gap-[10px] border-b border-line bg-[#f2f3ee] p-[12px_20px]">
          {isAdmin && (
            <form onSubmit={renameGroup} className="flex items-center gap-[8px]">
              <input placeholder="Rename group" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} disabled={busy} className="h-[32px] rounded-[8px] border border-[#c8cec2] bg-white px-[10px] text-[12px]" />
              <button type="submit" className="inline-flex h-[32px] items-center gap-[6px] rounded-[8px] border border-[#bcc5b8] bg-white px-[10px] text-[11px] font-bold text-ink" disabled={!renameValue.trim() || busy}>Rename</button>
            </form>
          )}
          <button className="inline-flex h-[32px] items-center gap-[6px] rounded-[8px] border border-[#eab0a4] bg-[#fff4f1] px-[10px] text-[11px] font-bold text-[#9f3f31]" onClick={leaveGroup} disabled={busy}>Leave group</button>
        </div>
      )}
    </>
  );
}
