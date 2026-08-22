import React from "react";
import { User } from "@/lib/api";

type Session = { token: string; user: User };

interface ProfileModalProps {
  session: Session;
  onClose: () => void;
}

export function ProfileModal({ session, onClose }: ProfileModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-[min(400px,100%)] rounded-[16px] bg-cream p-[30px] shadow-xl">
        <div className="mb-[20px] flex items-center justify-between">
          <h2 className="text-[20px] font-extrabold text-ink tracking-[-0.03em]">My Profile</h2>
          <button onClick={onClose} className="text-[24px] text-muted hover:text-ink">&times;</button>
        </div>
        <div className="flex flex-col items-center gap-[15px] mb-[30px]">
          <span className="grid h-[80px] w-[80px] place-items-center rounded-[24px_24px_24px_8px] bg-teal text-[32px] font-extrabold text-cream">
            {session.user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="text-center">
            <div className="text-[22px] font-bold text-ink tracking-[-0.04em]">{session.user.name}</div>
            <div className="text-[14px] text-muted font-dmmono">{session.user.phone ?? "No phone number"}</div>
          </div>
        </div>
        <div className="rounded-[8px] bg-[#eef0eb] p-[15px] text-[12px] text-muted font-dmmono">
          <div className="mb-[4px] uppercase tracking-[0.1em] text-[9px]">User ID</div>
          <div className="break-all">{session.user.id}</div>
        </div>
        <button
          onClick={onClose}
          className="mt-[20px] w-full rounded-[8px] bg-lime py-[12px] text-[13px] font-extrabold text-ink hover:opacity-90"
        >
          Close
        </button>
      </div>
    </div>
  );
}
