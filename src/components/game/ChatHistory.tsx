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

export default function ChatHistory({
  history,
  streamingNarrative,
  isLoading,
  chatEndRef,
}: Readonly<ChatHistoryProps>) {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
      {history.length > 0 ? (
        history.map((chat, index) => {
          const { roll, text } =
            chat.role === "gm"
              ? parseDiceRoll(chat.content)
              : { roll: null, text: chat.content };

          return (
            <div key={index} className="space-y-8">
              {chat.prologue && (
                <div className="w-full px-6 py-8 md:px-12 md:py-10 bg-black/50 border-y border-amber-900/30 shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]">
                  <div className="max-w-3xl mx-auto text-center text-amber-100/70 italic leading-loose tracking-wide whitespace-pre-wrap font-serif">
                    {chat.prologue}
                  </div>
                </div>
              )}
              <div
                className={`flex ${chat.role === "player" ? "justify-end" : "justify-start"}`}
              >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-md ${
                  chat.role === "player"
                    ? "bg-gradient-to-br from-stone-800 to-stone-800/60 border border-amber-900/30 text-amber-50 rounded-br-md"
                    : "prose prose-invert prose-p:leading-relaxed text-amber-50/90 bg-gradient-to-br from-amber-950/20 to-stone-950/40 border border-amber-900/20 rounded-bl-md"
                }`}
              >
                {chat.role === "player" && (
                  <div className="text-xs text-amber-400/60 mb-2 uppercase tracking-wider font-bold">
                    🧝 You
                  </div>
                )}
                {chat.role !== "player" && (
                  <div className="text-xs text-amber-500/50 mb-2 uppercase tracking-wider font-bold">
                    📜 GM
                  </div>
                )}
                {roll !== null && (
                  <div>
                    <DiceRollBadge roll={roll} />
                  </div>
                )}
                <div className="whitespace-pre-wrap">{text}</div>
              </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="flex items-center justify-center h-full text-amber-100/30 animate-pulse">
          กำลังเชื่อมต่อจิตวิญญาณ...
        </div>
      )}

      {streamingNarrative && (() => {
        const { roll, text } = parseDiceRoll(streamingNarrative);
        return (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md px-5 py-4 prose prose-invert prose-p:leading-relaxed text-amber-50/90 border border-amber-900/20 bg-gradient-to-br from-amber-950/20 to-stone-950/40 shadow-md">
              <div className="text-xs text-amber-400 mb-2 uppercase tracking-wider font-bold animate-pulse">
                📜 GM Is Typing...
              </div>
              {roll !== null && <DiceRollBadge roll={roll} />}
              <div className="whitespace-pre-wrap">{text}</div>
            </div>
          </div>
        );
      })()}

      {isLoading && !streamingNarrative && (
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl px-5 py-4 text-amber-100/40 italic animate-pulse border border-transparent">
            🎲 GM กำลังคำนวณผลลัพธ์และทอยเต๋าโชคชะตา...
          </div>
        </div>
      )}

      <div ref={chatEndRef} />
    </div>
  );
}
