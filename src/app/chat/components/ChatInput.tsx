import React, { FormEvent, useEffect, useRef, useState } from "react";
import { Smile, Send } from "lucide-react";
import EmojiPicker from 'emoji-picker-react';
import { Conversation } from "@/lib/api";

interface ChatInputProps {
  active: Conversation | null;
  busy: boolean;
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  onSend: (event: FormEvent) => void;
}

export function ChatInput({ active, busy, text, setText, onSend }: ChatInputProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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

  return (
    <div className="border-t border-line p-[18px_clamp(20px,8vw,130px)_24px] max-[800px]:px-[18px] relative bg-cream" ref={emojiPickerRef}>
      {showEmojiPicker && (
        <div className="absolute bottom-[calc(100%-10px)] right-[clamp(20px,8vw,130px)] z-50 max-[800px]:right-[18px] shadow-2xl rounded-lg">
          <EmojiPicker onEmojiClick={(emojiData) => { setText((prev) => prev + emojiData.emoji); setShowEmojiPicker(false); }} />
        </div>
      )}
      <form className="flex items-end gap-[10px] rounded-[15px] border border-line bg-white p-[8px_8px_8px_15px]" onSubmit={onSend}>
        <button type="button" className="mb-[8px] text-[#8c9991] hover:text-lime transition-colors shrink-0" onClick={() => setShowEmojiPicker(prev => !prev)} aria-label="Choose emoji"><Smile size={20} /></button>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSend(event); } }}
          placeholder={active ? "Write a message..." : "Choose a conversation first"}
          disabled={!active || busy}
          rows={1}
          className="max-h-[110px] min-h-[35px] flex-1 resize-none border-0 bg-transparent text-[13px] text-ink outline-none py-[8px]"
        />
        <button className="grid h-[38px] w-[38px] place-items-center rounded-[11px] border-0 bg-ink text-lime shrink-0" type="submit" disabled={!active || !text.trim() || busy} aria-label="Send message"><Send size={16} /></button>
      </form>
    </div>
  );
}
