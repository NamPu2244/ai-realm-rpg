import { useEffect, useRef, useState } from "react";
import { Send, RotateCcw, Skull, Sword, Compass, MessageCircle, Wand2, Package, ChevronRight, Lightbulb } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ActionBarProps {
  error: string | null;
  isLoading: boolean;
  isDead: boolean;
  suggestedActions: string[];
  input: string;
  isLowHp: boolean;
  worldTone?: string;
  onInputChange: (value: string) => void;
  onSend: (message: string) => void;
  onRetry: () => void;
  onRestart: () => void;
}

// ---- Suggested action type detection (unchanged) ----

type ActionType = "combat" | "explore" | "talk" | "magic" | "item" | "default";

interface ActionStyle {
  icon: LucideIcon;
  card: string;
  key: string;
  label: string;
}

const ACTION_STYLES: Record<ActionType, ActionStyle> = {
  combat: {
    icon: Sword,
    card: "border-red-800/50 hover:border-red-600/70 hover:bg-red-950/30 text-red-200/80 hover:text-red-100",
    key: "text-red-700/60 group-hover:text-red-500/80",
    label: "Combat",
  },
  explore: {
    icon: Compass,
    card: "border-emerald-800/40 hover:border-emerald-600/60 hover:bg-emerald-950/25 text-emerald-200/80 hover:text-emerald-100",
    key: "text-emerald-700/60 group-hover:text-emerald-500/80",
    label: "Explore",
  },
  talk: {
    icon: MessageCircle,
    card: "border-sky-800/40 hover:border-sky-600/60 hover:bg-sky-950/25 text-sky-200/80 hover:text-sky-100",
    key: "text-sky-700/60 group-hover:text-sky-500/80",
    label: "Dialogue",
  },
  magic: {
    icon: Wand2,
    card: "border-purple-800/40 hover:border-purple-600/60 hover:bg-purple-950/25 text-purple-200/80 hover:text-purple-100",
    key: "text-purple-700/60 group-hover:text-purple-500/80",
    label: "Magic",
  },
  item: {
    icon: Package,
    card: "border-amber-800/40 hover:border-amber-600/60 hover:bg-amber-950/25 text-amber-200/80 hover:text-amber-100",
    key: "text-amber-700/60 group-hover:text-amber-500/80",
    label: "Item",
  },
  default: {
    icon: ChevronRight,
    card: "border-theme-border hover:border-theme-accent/50 hover:bg-theme-surface text-theme-text/65 hover:text-theme-text",
    key: "text-theme-accent/60 group-hover:text-theme-accent/80",
    label: "Action",
  },
};

const COMBAT_RE = /โจมตี|ต่อสู้|ฆ่า|ยิง|ตี|ฟัน|ป้องกัน|ระเบิด|attack|fight|kill|strike|slash|defend|shoot/i;
const EXPLORE_RE = /เดิน|วิ่ง|มุ่งหน้า|สำรวจ|ค้นหา|ซ่อน|หลบ|หนี|ปีน|go|move|run|explore|search|hide|flee/i;
const TALK_RE = /พูด|ถาม|เจรจา|ทักทาย|โน้มน้าว|talk|ask|speak|say|negotiate|greet|persuade/i;
const MAGIC_RE = /ร่าย|เวทย์|สาป|เรียก|ปลุก|cast|spell|magic|enchant|summon|curse/i;
const ITEM_RE = /ใช้|หยิบ|วาง|ดื่ม|ฉีด|เปิด|ปิด|use|take|drink|equip|apply|open|close/i;

function detectActionType(text: string): ActionType {
  if (COMBAT_RE.test(text)) return "combat";
  if (MAGIC_RE.test(text)) return "magic";
  if (ITEM_RE.test(text)) return "item";
  if (EXPLORE_RE.test(text)) return "explore";
  if (TALK_RE.test(text)) return "talk";
  return "default";
}

// ---- Player action type selector ----

type PlayerActionTypeId = "speak" | "think" | "act" | "investigate";

interface PlayerActionType {
  id: PlayerActionTypeId;
  emoji: string;
  label: string;
  placeholder: string;
  activeClass: string;
  inactiveClass: string;
}

const PLAYER_ACTION_TYPES: PlayerActionType[] = [
  {
    id: "speak",
    emoji: "💬",
    label: "พูด",
    placeholder: "ตัวละครของคุณจะพูดว่าอะไร?",
    activeClass: "bg-sky-950/60 border-sky-500/70 text-sky-200",
    inactiveClass: "border-stone-700/40 text-stone-500 hover:border-sky-800/50 hover:text-sky-400/70",
  },
  {
    id: "think",
    emoji: "💭",
    label: "คิด",
    placeholder: "ตัวละครของคุณคิดอะไรอยู่? (NPC ไม่รับรู้)",
    activeClass: "bg-purple-950/60 border-purple-500/70 text-purple-200",
    inactiveClass: "border-stone-700/40 text-stone-500 hover:border-purple-800/50 hover:text-purple-400/70",
  },
  {
    id: "act",
    emoji: "⚔️",
    label: "ทำ",
    placeholder: "ตัวละครของคุณจะทำอะไร?",
    activeClass: "bg-theme-surface border-theme-accent/70 text-theme-accent",
    inactiveClass: "border-stone-700/40 text-stone-500 hover:border-theme-accent/50 hover:text-theme-accent/70",
  },
  {
    id: "investigate",
    emoji: "🔍",
    label: "สำรวจ",
    placeholder: "คุณจะตรวจสอบอะไร?",
    activeClass: "bg-emerald-950/60 border-emerald-500/70 text-emerald-200",
    inactiveClass: "border-stone-700/40 text-stone-500 hover:border-emerald-800/50 hover:text-emerald-400/70",
  },
];

// ---- Dead panel ----

function DeadPanel({ worldTone, onRestart }: Readonly<{ worldTone?: string; onRestart: () => void }>) {
  if (worldTone === "hardcore") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-2 w-full py-3 bg-neutral-950/80 border border-red-900/60 rounded-xl text-center">
          <Skull size={16} className="text-red-700" />
          <span className="text-red-600/90 font-bold tracking-widest text-sm">ตายถาวร — การเดินทางของเจ้าจบลง</span>
        </div>
        <button
          onClick={onRestart}
          className="flex items-center justify-center gap-2 w-full py-3 bg-stone-900/80 hover:bg-stone-800 text-stone-300 border border-stone-700 font-bold rounded-xl tracking-widest transition-colors text-sm"
        >
          เริ่มการเดินทางใหม่
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={onRestart}
      className="flex items-center justify-center gap-2 w-full py-4 bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-700 font-bold rounded-xl tracking-widest transition-colors shadow-[0_0_30px_rgba(220,38,38,0.5)]"
    >
      <Skull size={18} /> เจ้าได้ตายแล้ว — เกิดใหม่
    </button>
  );
}

// ---- Main component ----

export default function ActionBar({
  error,
  isLoading,
  isDead,
  suggestedActions,
  input,
  isLowHp,
  worldTone,
  onInputChange,
  onSend,
  onRetry,
  onRestart,
}: Readonly<ActionBarProps>) {
  const inputHistoryRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const [selectedType, setSelectedType] = useState<PlayerActionTypeId | null>(null);
  // Suggested actions are shown by default every turn — concrete choices are what keep the
  // game from feeling like an open-ended chat ("…so what do I do now?"). Still dismissible
  // (the "ซ่อน" button), and re-shown for each new turn. Reset during render (React's "adjust
  // state when a prop changes" pattern) when the suggestions change — avoids a setState-in-effect.
  const [showHints, setShowHints] = useState(true);
  const [prevSuggestions, setPrevSuggestions] = useState(suggestedActions);
  if (suggestedActions !== prevSuggestions) {
    setPrevSuggestions(suggestedActions);
    setShowHints(true);
  }

  // Number keys 1-N pick a hint — but only while the hints are actually revealed, so the
  // shortcut stays consistent with what's on screen (and never collides with the QTE keys,
  // since a QTE turn clears suggestions / re-hides hints).
  useEffect(() => {
    if (isLoading || isDead || !showHints || suggestedActions.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = Number.parseInt(e.key) - 1;
      if (idx >= 0 && idx < suggestedActions.length) onSend(suggestedActions[idx]);
    };
    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  }, [isLoading, isDead, showHints, suggestedActions, onSend]);

  const activeMeta = selectedType ? PLAYER_ACTION_TYPES.find((t) => t.id === selectedType) : null;
  const placeholder = activeMeta?.placeholder ?? "ตัวละครของคุณจะทำอะไร? เช่น 'มองไปรอบๆ' 'คุยกับเขา' 'มุ่งหน้าไปทางเหนือ'";

  // Input is gated on a mode being chosen; reflect that in the placeholder.
  let inputPlaceholder = "เลือกโหมด (พูด/คิด/ทำ/สำรวจ) ด้านบนก่อนถึงจะพิมพ์ได้";
  if (isLoading) inputPlaceholder = "GM กำลังประมวลผล...";
  else if (selectedType) inputPlaceholder = placeholder;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hist = inputHistoryRef.current;
    if (e.key === "ArrowUp" && hist.length > 0) {
      e.preventDefault();
      const next = Math.min(historyIdxRef.current + 1, hist.length - 1);
      historyIdxRef.current = next;
      onInputChange(hist[hist.length - 1 - next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(historyIdxRef.current - 1, -1);
      historyIdxRef.current = next;
      onInputChange(next === -1 ? "" : hist[hist.length - 1 - next]);
    }
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    // A mode must be chosen before free-text is allowed (the input is disabled otherwise).
    if (!selectedType) return;
    const text = input.trim();
    if (!text) return;
    inputHistoryRef.current.push(text);
    historyIdxRef.current = -1;
    const msg = selectedType ? `[${selectedType}]: ${text}` : text;
    onSend(msg);
  };

  const handleTypeSelect = (id: PlayerActionTypeId) => {
    setSelectedType((prev) => (prev === id ? null : id));
  };

  const handleNoResponse = () => {
    onSend("[no response]");
  };

  return (
    <div className="p-4 md:p-6 border-t border-theme-border bg-theme-surface flex flex-col gap-3">
      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-950/40 border border-red-800/50 rounded-xl text-sm text-red-300">
          <span>⚠️ {error}</span>
          <button
            onClick={onRetry}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/60 hover:bg-red-800 border border-red-700 rounded-lg text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-50"
          >
            <RotateCcw size={12} /> {isLoading ? "..." : "ลองใหม่"}
          </button>
        </div>
      )}
      {isDead ? (
        <DeadPanel worldTone={worldTone} onRestart={onRestart} />
      ) : (
        <>
          {suggestedActions.length > 0 && !showHints && (
            <button
              type="button"
              onClick={() => setShowHints(true)}
              disabled={isLoading}
              className="self-start flex items-center gap-2 px-3 py-1.5 text-xs text-theme-muted hover:text-theme-accent border border-theme-border/60 hover:border-theme-accent/40 rounded-lg transition-all disabled:opacity-40"
            >
              <Lightbulb size={13} /> ดูทางเลือก
            </button>
          )}

          {suggestedActions.length > 0 && showHints && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-theme-accent/60 font-medium">เลือกสิ่งที่ตัวละครจะทำ</span>
                <button
                  type="button"
                  onClick={() => setShowHints(false)}
                  className="text-[11px] text-theme-muted hover:text-theme-text transition-colors"
                >
                  ซ่อน
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {suggestedActions.map((action, i) => {
                  const type = detectActionType(action);
                  const style = ACTION_STYLES[type];
                  const Icon = style.icon;
                  return (
                    <button
                      key={`${i}-${action.slice(0, 12)}`}
                      onClick={() => onSend(action)}
                      disabled={isLoading}
                      title={`AI suggested action — press [${i + 1}] or click to perform`}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm bg-theme-surface/60 border rounded-lg transition-all disabled:opacity-40 group ${style.card}`}
                    >
                      <span className={`shrink-0 transition-colors ${style.key}`}>
                        <Icon size={14} />
                      </span>
                      <span className="leading-snug flex-1">{action}</span>
                      <span className={`text-[10px] font-mono shrink-0 transition-colors ${style.key}`}>[{i + 1}]</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action type selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-theme-muted uppercase tracking-widest shrink-0 mr-0.5">โหมด</span>
            {PLAYER_ACTION_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTypeSelect(t.id)}
                disabled={isLoading}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all disabled:opacity-40 ${
                  selectedType === t.id ? t.activeClass : t.inactiveClass
                }`}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={handleNoResponse}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all disabled:opacity-40 border-stone-700/40 text-stone-500 hover:border-stone-500/60 hover:text-stone-300"
            >
              <span>🚫</span>
              <span>นิ่งเฉย</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || !selectedType}
              placeholder={inputPlaceholder}
              className={`flex-1 bg-theme-surface border ${
                isLowHp ? "border-red-900/50 focus:border-red-500" : "border-theme-border focus:border-theme-accent/60"
              } ${isLoading ? "animate-input-pulse" : ""} rounded-xl px-4 py-3 text-theme-text focus:outline-none disabled:opacity-50 transition-colors placeholder:text-theme-muted/50`}
            />
            <button
              type="submit"
              disabled={isLoading || !selectedType || !input.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-theme-accent text-theme-bg font-bold rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-[0_0_20px_var(--theme-accent-glow)] hover:shadow-[0_0_28px_var(--theme-accent-glow)]"
            >
              {isLoading ? "..." : <><Send size={15} /> ส่ง</>}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
