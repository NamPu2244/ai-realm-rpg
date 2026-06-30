"use client";

import { memo, RefObject } from "react";
import { Dices, TrendingDown, TrendingUp, Droplets, Hourglass } from "lucide-react";
import { ChatLog } from "@/store/useGameStore";
import { parseDiceRoll } from "@/lib/gameText";
import DiceRollBadge from "./DiceRollBadge";
import NarrativeRenderer from "./NarrativeRenderer";

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

// ---- Action type metadata (mirrors ActionBar definitions) ----
const ACTION_TYPE_META: Record<string, { label: string; colorClass: string }> = {
  speak: { label: "💬 Speak", colorClass: "text-sky-300 bg-sky-950/50 border-sky-700/50" },
  think: { label: "💭 Think", colorClass: "text-purple-300 bg-purple-950/50 border-purple-700/50" },
  act: { label: "⚔️ Act", colorClass: "text-amber-300 bg-amber-950/50 border-amber-700/50" },
  investigate: { label: "🔍 Investigate", colorClass: "text-emerald-300 bg-emerald-950/50 border-emerald-700/50" },
  "no response": { label: "🚫 No Response", colorClass: "text-neutral-400 bg-neutral-900/60 border-neutral-700/40" },
};

function parsePlayerContent(content: string): { actionType: string | null; text: string } {
  const m = /^\[(speak|think|act|investigate)\]:\s*([\s\S]*)/.exec(content);
  if (m) return { actionType: m[1], text: m[2] };
  if (content === "[no response]") return { actionType: "no response", text: "" };
  return { actionType: null, text: content };
}

// ---- Sub-components ----

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


// World/GM-side beat the player did NOT cause (QTE / countdown timing out while idle).
// Centered, muted, and visually distinct from both player bubbles and GM narrative.
function SystemMarker({ content }: Readonly<{ content: string }>) {
  return (
    <div className="flex justify-center animate-narrative-in">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-neutral-900/70 border border-neutral-700/40 rounded-full text-[11px] text-neutral-400 italic tracking-wide shadow-sm">
        <Hourglass size={12} className="shrink-0 text-neutral-500" />
        <span className="whitespace-pre-wrap text-center">{content}</span>
      </div>
    </div>
  );
}

function PlayerBubble({ content }: Readonly<{ content: string }>) {
  const { actionType, text } = parsePlayerContent(content);
  const meta = actionType ? ACTION_TYPE_META[actionType] : null;

  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] px-4 py-3 bg-stone-800/60 border border-amber-900/25 rounded-2xl rounded-br-sm text-amber-50/90 text-sm shadow-md">
        <div className="flex items-center gap-2 mb-1.5">
          {meta ? (
            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold tracking-widest uppercase ${meta.colorClass}`}>
              {meta.label}
            </span>
          ) : (
            <span className="text-[10px] text-amber-400/40 uppercase tracking-widest font-semibold">You</span>
          )}
        </div>
        {text && <div className="whitespace-pre-wrap leading-relaxed">{text}</div>}
      </div>
    </div>
  );
}

function GMMessage({ chat, isStreaming = false }: Readonly<{ chat: Pick<ChatLog, "content" | "scene_image_prompt" | "dialogue_lines">; isStreaming?: boolean }>) {
  const { roll, text } = parseDiceRoll(chat.content);
  return (
    <div className={`space-y-4 ${isStreaming ? "" : "animate-narrative-in"}`}>
      {roll !== null && <DiceRollBadge roll={roll} />}
      <NarrativeRenderer
        text={text}
        dialogueLines={isStreaming ? [] : (chat.dialogue_lines ?? [])}
        isStreaming={isStreaming}
      />
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

  const renderRow = (chat: ChatLog, index: number) => {
    if (chat.role === "gm") {
      return (
        <div className="space-y-2">
          <GMMessage chat={chat} />
          {!isLoading && !streamingNarrative && index === lastGmIndex && lastStatChange && (
            <StatChangeBadges delta={lastStatChange} />
          )}
        </div>
      );
    }
    if (chat.role === "system") return <SystemMarker content={chat.content} />;
    return <PlayerBubble content={chat.content} />;
  };

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

            {renderRow(chat, index)}

            {index < history.length - 1 && chat.role === "gm" && history[index + 1]?.role === "gm" && (
              <div className="border-t border-amber-900/10 w-1/2 mx-auto" />
            )}
          </div>
        ))
      ) : (
        <div className="flex items-center justify-center h-full text-amber-100/30 animate-pulse text-sm tracking-widest">
          Connecting to the realm...
        </div>
      )}

      {!streamingNarrative && !isLoading && history.length === 1 && history[0].role === "gm" && (
        <div className="flex items-start gap-3 px-5 py-4 bg-amber-950/20 border border-amber-800/25 rounded-xl">
          <span className="text-amber-500/50 text-base shrink-0 leading-none mt-0.5">💡</span>
          <p className="text-xs text-amber-100/45 leading-relaxed">
            <span className="text-amber-400/70 font-semibold">You are a character in this story</span>
            {" "}— choose an option below, or type what your character will do, e.g.{" "}
            <span className="italic text-amber-300/55">&ldquo;Look around the room&rdquo;</span>
            {" "}or{" "}
            <span className="italic text-amber-300/55">&ldquo;Walk toward the door&rdquo;</span>
          </p>
        </div>
      )}

      {streamingNarrative && (
        <div className="space-y-3">
          <div className="text-[10px] text-amber-400/40 uppercase tracking-widest animate-pulse">Writing...</div>
          <GMMessage chat={{ content: streamingNarrative }} isStreaming />
        </div>
      )}

      {isLoading && !streamingNarrative && (
        <div className="flex items-center gap-2 text-amber-100/30 italic animate-pulse text-sm tracking-wide">
          <Dices size={14} /> Rolling the dice of fate...
        </div>
      )}

      <div ref={chatEndRef} />
    </div>
  );
}

export default memo(ChatHistory);
