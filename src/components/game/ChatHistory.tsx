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
            <div
              key={index}
              className={`flex ${chat.role === "player" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-5 py-4 ${
                  chat.role === "player"
                    ? "bg-neutral-800 border border-neutral-700 text-neutral-300"
                    : "prose prose-invert prose-p:leading-relaxed text-neutral-200"
                }`}
              >
                {chat.role === "player" && (
                  <div className="text-xs text-neutral-500 mb-2 uppercase tracking-wider font-bold">
                    You
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
          );
        })
      ) : (
        <div className="flex items-center justify-center h-full text-neutral-600 animate-pulse">
          กำลังเชื่อมต่อจิตวิญญาณ...
        </div>
      )}

      {streamingNarrative && (() => {
        const { roll, text } = parseDiceRoll(streamingNarrative);
        return (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg px-5 py-4 prose prose-invert prose-p:leading-relaxed text-neutral-200 border border-neutral-800 bg-neutral-950/50 shadow-lg">
              <div className="text-xs text-blue-400 mb-2 uppercase tracking-wider font-bold animate-pulse">
                GM Is Typing...
              </div>
              {roll !== null && <DiceRollBadge roll={roll} />}
              <div className="whitespace-pre-wrap">{text}</div>
            </div>
          </div>
        );
      })()}

      {isLoading && !streamingNarrative && (
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-lg px-5 py-4 text-neutral-500 italic animate-pulse border border-transparent">
            GM กำลังคำนวณผลลัพธ์และทอยเต๋าโชคชะตา...
          </div>
        </div>
      )}

      <div ref={chatEndRef} />
    </div>
  );
}
