"use client";

import { memo, RefObject } from "react";
import { Dices, TrendingDown, TrendingUp, Droplets, MessageSquare } from "lucide-react";
import { ChatLog, DialogueLine } from "@/store/useGameStore";
import { parseDiceRoll } from "@/lib/gameText";
import DiceRollBadge from "./DiceRollBadge";

export interface StatChange {
  hp: number;
  mana: number;
}

interface ChatHistoryProps {
  history: ChatLog[];
  streamingNarrative: string;
  isLoading: boolean;
  chatEndRef: RefObject<HTMLDivElement | null>;
  lastStatChange: StatChange | null;
}

function StatChangeBadges({ delta }: Readonly<{ delta: StatChange }>) {
  const badges: React.ReactNode[] = [];

  if (delta.hp !== 0) {
    const isGain = delta.hp > 0;
    badges.push(
      <span
        key="hp"
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border animate-stat-pop ${
          isGain
            ? "bg-emerald-950/60 border-emerald-700/50 text-emerald-300"
            : "bg-red-950/60 border-red-700/50 text-red-300"
        }`}
      >
        {isGain ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {isGain ? "+" : ""}{delta.hp} HP
      </span>
    );
  }

  if (delta.mana !== 0) {
    const isGain = delta.mana > 0;
    badges.push(
      <span
        key="mana"
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border animate-stat-pop ${
          isGain
            ? "bg-sky-950/60 border-sky-700/50 text-sky-300"
            : "bg-indigo-950/60 border-indigo-700/50 text-indigo-300"
        }`}
      >
        <Droplets size={11} />
        {isGain ? "+" : ""}{delta.mana} Mana
      </span>
    );
  }

  if (badges.length === 0) return null;
  return <div className="flex flex-wrap gap-2 pl-5 pt-1">{badges}</div>;
}

function DialogueBlock({ lines }: Readonly<{ lines: DialogueLine[] }>) {
  if (lines.length === 0) return null;
  return (
    <div className="space-y-2 pl-5">
      {lines.map((line) => (
        <div key={line.speaker + ":" + line.text.slice(0, 32)} className="flex gap-2.5 items-start">
          <MessageSquare size={13} className="text-amber-600/50 mt-1 shrink-0" />
          <div>
            <span className="text-[11px] font-bold tracking-wide text-amber-500/80 mr-2">{line.speaker}</span>
            <span className="text-[0.9rem] italic text-amber-100/75 leading-relaxed">&#8220;{line.text}&#8221;</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function GMMessage({ chat, isStreaming = false }: Readonly<{ chat: Pick<ChatLog, "content" | "scene_image_prompt" | "dialogue_lines">; isStreaming?: boolean }>) {
  const { roll, text } = parseDiceRoll(chat.content);
  return (
    <div className={`space-y-4 ${isStreaming ? "" : "animate-narrative-in"}`}>
      {roll !== null && <DiceRollBadge roll={roll} />}
      <p className="text-amber-50/85 leading-[2] text-[0.95rem] whitespace-pre-wrap tracking-wide border-l-2 border-amber-800/40 pl-5">
        {text}
        {isStreaming && (
          <span className="inline-block w-0.5 h-[1em] bg-amber-400/80 ml-0.5 align-middle animate-cursor-blink" />
        )}
      </p>
      {chat.dialogue_lines && chat.dialogue_lines.length > 0 && (
        <DialogueBlock lines={chat.dialogue_lines} />
      )}
    </div>
  );
}

function ChatHistory({
  history,
  streamingNarrative,
  isLoading,
  chatEndRef,
  lastStatChange,
}: Readonly<ChatHistoryProps>) {
  const lastGmIndex = history.reduce((acc, chat, i) => (chat.role === "gm" ? i : acc), -1);

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
              <div className="space-y-2">
                <GMMessage chat={chat} />
                {!isLoading && !streamingNarrative && index === lastGmIndex && lastStatChange && (
                  <StatChangeBadges delta={lastStatChange} />
                )}
              </div>
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

      {!streamingNarrative && !isLoading && history.length === 1 && history[0].role === "gm" && (
        <div className="flex items-start gap-3 px-5 py-4 bg-amber-950/20 border border-amber-800/25 rounded-xl">
          <span className="text-amber-500/50 text-base shrink-0 leading-none mt-0.5">💡</span>
          <p className="text-xs text-amber-100/45 leading-relaxed">
            <span className="text-amber-400/70 font-semibold">คุณคือตัวละครในเรื่องนี้</span>
            {" "}— เลือกตัวเลือกด้านล่าง หรือพิมพ์สิ่งที่ตัวละครคุณจะทำ เช่น{" "}
            <span className="italic text-amber-300/55">&ldquo;มองรอบๆ ห้อง&rdquo;</span>
            {" "}หรือ{" "}
            <span className="italic text-amber-300/55">&ldquo;เดินไปทางประตู&rdquo;</span>
          </p>
        </div>
      )}

      {streamingNarrative && (
        <div className="space-y-3">
          <div className="text-[10px] text-amber-400/40 uppercase tracking-widest animate-pulse">กำลังเขียน...</div>
          <GMMessage chat={{ content: streamingNarrative }} isStreaming />
        </div>
      )}

      {isLoading && !streamingNarrative && (
        <div className="flex items-center gap-2 text-amber-100/30 italic animate-pulse text-sm tracking-wide">
          <Dices size={14} /> กำลังทอยเต๋าโชคชะตา...
        </div>
      )}

      <div ref={chatEndRef} />
    </div>
  );
}

export default memo(ChatHistory);
