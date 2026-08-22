import React from "react";
import { ChevronDown } from "lucide-react";
import { Conversation, Message, User } from "@/lib/api";

type Session = { token: string; user: User };

interface MessageListProps {
  active: Conversation | null;
  messages: Message[];
  session: Session | null;
  loading: boolean;
  error: string;
  shouldStickToBottom: React.MutableRefObject<boolean>;
  showScrollButton: boolean;
  setShowScrollButton: React.Dispatch<React.SetStateAction<boolean>>;
  endRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: () => void;
  loadingConversations: boolean;
}

export function MessageList({
  active, messages, session, loading, error, shouldStickToBottom, showScrollButton, setShowScrollButton, endRef, scrollToBottom, loadingConversations
}: MessageListProps) {

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
    shouldStickToBottom.current = isNearBottom;
    setShowScrollButton(!isNearBottom);
  };

  return (
    <>
      {error && <div className="mt-[15px] mx-[25px] p-[12px_15px] border border-[#f3b8ad] rounded-[9px] text-[#9a392c] bg-[#fff1ee] text-[12px]">{error}</div>}

      <div className="relative flex-1 overflow-auto p-[30px_clamp(20px,8vw,130px)] max-[800px]:px-[18px]" onScroll={handleScroll}>
        {!active && !loadingConversations ? (
          <div className="m-auto text-center text-muted"><strong className="mb-[8px] block text-[18px] text-ink">A quiet inbox, for now.</strong>Search for someone to start a new thread.</div>
        ) : loading || loadingConversations ? (
          <div className="p-[40px] flex flex-col gap-[25px] animate-pulse">
            <div className="flex gap-[15px]"><div className="h-[40px] w-[40px] rounded-[12px_12px_12px_4px] bg-[#edf0e8]"></div><div className="flex-1 space-y-[8px] py-[5px]"><div className="h-[12px] w-[40%] max-w-[200px] bg-[#edf0e8] rounded"></div><div className="h-[12px] w-[60%] max-w-[300px] bg-[#edf0e8] rounded"></div></div></div>
            <div className="flex gap-[15px] flex-row-reverse"><div className="flex-1 space-y-[8px] py-[5px] flex flex-col items-end"><div className="h-[12px] w-[30%] max-w-[150px] bg-[#edf0e8] rounded"></div><div className="h-[12px] w-[50%] max-w-[250px] bg-[#edf0e8] rounded"></div></div></div>
            <div className="flex gap-[15px]"><div className="h-[40px] w-[40px] rounded-[12px_12px_12px_4px] bg-[#edf0e8]"></div><div className="flex-1 space-y-[8px] py-[5px]"><div className="h-[12px] w-[70%] max-w-[350px] bg-[#edf0e8] rounded"></div></div></div>
          </div>
        ) : messages.length ? (
          <>
            {messages.map((message) => {
              const own = message.senderId === session?.user.id || message.senderId === "me";
              let senderName = message.sender?.name;
              if (!senderName) {
                const participant = active?.participants?.find(p => p.id === message.senderId);
                if (participant) senderName = participant.name;
              }

              return (
                <div className={`my-[15px] flex ${own ? "justify-end" : ""}`} key={message.id}>
                  <div className="relative group flex items-center max-w-[min(560px,78%)]">
                    <article className={`rounded-[4px_16px_16px_16px] bg-[#edf0e8] p-[13px_16px] w-full ${own ? "rounded-[16px_4px_16px_16px] bg-teal text-white" : ""}`}>
                      {!own && <div className="mb-[5px] text-[10px] font-extrabold text-teal">{senderName ?? active?.name}</div>}
                      <div className="text-[13px] leading-[1.55]">{message.text}</div>
                      <div className={`mt-[7px] font-dmmono text-[9px] ${own ? "text-[#b9d6ce]" : "text-[#8c9891]"}`}>
                        {(() => {
                          const date = new Date(message.createdAt);
                          const now = new Date();
                          const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                          const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
                          if (isToday) return time;
                          const isThisYear = date.getFullYear() === now.getFullYear();
                          if (isThisYear) return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
                          return `${date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}, ${time}`;
                        })()}
                      </div>
                    </article>
                  </div>
                </div>
              );
            })}
            {showScrollButton && (
              <button onClick={scrollToBottom} className="absolute bottom-[40px] right-[clamp(20px,8vw,130px)] max-[800px]:right-[18px] grid h-[40px] w-[40px] place-items-center rounded-full bg-lime text-ink shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:scale-105 transition-transform z-10" aria-label="Scroll to bottom">
                <ChevronDown size={20} />
              </button>
            )}
            <div ref={endRef} />
          </>
        ) : (
          <div className="m-auto text-center text-muted"><strong className="mb-[8px] block text-[18px] text-ink">This is the beginning.</strong>Send the first message and make it count.</div>
        )}
      </div>
    </>
  );
}
