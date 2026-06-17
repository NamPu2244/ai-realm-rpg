"use client";

import { RefObject } from "react";
import { ChatLog } from "@/store/useGameStore";
import { parseDiceRoll } from "@/lib/gameText";
import DiceRollBadge from "./DiceRollBadge";

interface ChatHistoryProps {
  history: ChatLog[];
  streamingNarrative: string;
  isLoading: boolean;
  chatEndRef: RefObject<HTMLDivElement | null>;
}

function GMMessage({ chat, isStreaming = false }: Readonly<{ chat: Pick<ChatLog, "content" | "scene_image_prompt">; isStreaming?: boolean }>) {
  const { roll, text } = parseDiceRoll(chat.content);
  return (
    <div className={`space-y-4 ${isStreaming ? "" : "animate-narrative-in"}`}>
      {roll !== null && <DiceRollBadge roll={roll} />}
      <p className={`text-amber-50/85 leading-[2] text-[0.95rem] whitespace-pre-wrap tracking-wide border-l-2 border-amber-800/40 pl-5 ${isStreaming ? "animate-pulse" : ""}`}>
        {text}
      </p>
    </div>
  );
}

export default function ChatHistory({
  history,
  streamingNarrative,
  isLoading,
  chatEndRef,
}: Readonly<ChatHistoryProps>) {
  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 space-y-10">
      {history.length > 0 ? (
        history.map((chat, index) => (
          <div key={`${chat.role}-${index}-${chat.content.slice(0, 16)}`} className="space-y-6">
            {chat.prologue && (
              <div className="w-full px-6 py-8 md:px-12 md:py-10 bg-black/50 border-y border-amber-900/30 shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]">
                <div className="max-w-3xl mx-auto text-center text-amber-100/70 italic leading-loose tracking-wide whitespace-pre-wrap font-serif text-sm">
                  {chat.prologue}
                </div>
              </div>
            )}

            {chat.role === "gm" ? (
              <GMMessage chat={chat} />
            ) : (
              <div className="flex justify-end">
                <div className="max-w-[75%] px-4 py-3 bg-stone-800/60 border border-amber-900/25 rounded-2xl rounded-br-sm text-amber-50/90 text-sm shadow-md">
                  <div className="text-[10px] text-amber-400/40 mb-1.5 uppercase tracking-widest font-semibold">คุณ</div>
                  <div className="whitespace-pre-wrap leading-relaxed">{chat.content}</div>
                </div>
              </div>
            )}

            {index < history.length - 1 && chat.role === "gm" && history[index + 1]?.role === "gm" && (
              <div className="border-t border-amber-900/10 w-1/2 mx-auto" />
            )}
          </div>
        ))
      ) : (
        <div className="flex items-center justify-center h-full text-amber-100/30 animate-pulse text-sm tracking-widest">
          กำลังเชื่อมต่อจิตวิญญาณ...
        </div>
      )}

      {streamingNarrative && (
        <div className="space-y-3">
          <div className="text-[10px] text-amber-400/40 uppercase tracking-widest animate-pulse">กำลังเขียน...</div>
          <GMMessage chat={{ content: streamingNarrative }} isStreaming />
        </div>
      )}

      {isLoading && !streamingNarrative && (
        <div className="text-amber-100/30 italic animate-pulse text-sm tracking-wide">
          🎲 กำลังทอยเต๋าโชคชะตา...
        </div>
      )}

      <div ref={chatEndRef} />
    </div>
  );
}
