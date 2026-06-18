import { useRef } from "react";
import { Send, RotateCcw, Skull, Sword, Compass, MessageCircle, Wand2, Package, ChevronRight } from "lucide-react";
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
  onSubmit: () => void;
  onRetry: () => void;
  onRestart: () => void;
}

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
    label: "โจมตี",
  },
  explore: {
    icon: Compass,
    card: "border-emerald-800/40 hover:border-emerald-600/60 hover:bg-emerald-950/25 text-emerald-200/80 hover:text-emerald-100",
    key: "text-emerald-700/60 group-hover:text-emerald-500/80",
    label: "สำรวจ",
  },
  talk: {
    icon: MessageCircle,
    card: "border-sky-800/40 hover:border-sky-600/60 hover:bg-sky-950/25 text-sky-200/80 hover:text-sky-100",
    key: "text-sky-700/60 group-hover:text-sky-500/80",
    label: "พูดคุย",
  },
  magic: {
    icon: Wand2,
    card: "border-purple-800/40 hover:border-purple-600/60 hover:bg-purple-950/25 text-purple-200/80 hover:text-purple-100",
    key: "text-purple-700/60 group-hover:text-purple-500/80",
    label: "เวทมนตร์",
  },
  item: {
    icon: Package,
    card: "border-amber-800/40 hover:border-amber-600/60 hover:bg-amber-950/25 text-amber-200/80 hover:text-amber-100",
    key: "text-amber-700/60 group-hover:text-amber-500/80",
    label: "ไอเทม",
  },
  default: {
    icon: ChevronRight,
    card: "border-stone-700/50 hover:border-amber-800/50 hover:bg-amber-950/20 text-amber-200/65 hover:text-amber-100",
    key: "text-amber-700/60 group-hover:text-amber-500/80",
    label: "กระทำ",
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

function DeadPanel({ worldTone, onRestart }: Readonly<{ worldTone?: string; onRestart: () => void }>) {
  if (worldTone === "hardcore") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-2 w-full py-3 bg-neutral-950/80 border border-red-900/60 rounded-xl text-center">
          <Skull size={16} className="text-red-700" />
          <span className="text-red-600/90 font-bold tracking-widest text-sm uppercase">Permadeath — การเดินทางสิ้นสุดแล้ว</span>
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
      <Skull size={18} /> คุณเสียชีวิตแล้ว — จุติใหม่
    </button>
  );
}

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
  onSubmit,
  onRetry,
  onRestart,
}: Readonly<ActionBarProps>) {
  const inputHistoryRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);

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
    if (input.trim()) {
      inputHistoryRef.current.push(input.trim());
      historyIdxRef.current = -1;
    }
    onSubmit();
  };

  return (
    <div className="p-4 md:p-6 border-t border-amber-900/20 bg-stone-950/70 flex flex-col gap-3">
      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-950/40 border border-red-800/50 rounded-xl text-sm text-red-300">
          <span>⚠️ {error}</span>
          <button
            onClick={onRetry}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/60 hover:bg-red-800 border border-red-700 rounded-lg text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-50"
          >
            <RotateCcw size={12} /> {isLoading ? "..." : "ลองอีกครั้ง"}
          </button>
        </div>
      )}
      {isDead ? (
        <DeadPanel worldTone={worldTone} onRestart={onRestart} />
      ) : (
        <>
          {suggestedActions.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-amber-400/35 uppercase tracking-widest px-1">ตัวเลือก</div>
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
                      title={`ตัวเลือกที่ AI แนะนำ — กดปุ่ม [${i + 1}] หรือคลิกเพื่อทำทันที`}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm bg-stone-900/50 border rounded-lg transition-all disabled:opacity-40 group ${style.card}`}
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

          <form
            onSubmit={handleSubmit}
            className="flex gap-3 mt-1"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={isLoading ? "GM กำลังประมวลผล..." : "พิมพ์สิ่งที่คุณต้องการทำ... (↑↓ ดูประวัติ)"}
              className={`flex-1 bg-stone-900/60 border ${isLowHp ? "border-red-900/50 focus:border-red-500" : "border-amber-900/30 focus:border-amber-500/60"} rounded-xl px-4 py-3 focus:outline-none disabled:opacity-50 transition-colors placeholder:text-amber-100/30`}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 transition-all shadow-[0_0_20px_rgba(217,119,6,0.25)] hover:shadow-[0_0_25px_rgba(217,119,6,0.4)]"
            >
              {isLoading ? "..." : <><Send size={15} /> ส่ง</>}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
