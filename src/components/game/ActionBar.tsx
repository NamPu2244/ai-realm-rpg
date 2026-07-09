import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Send, RotateCcw, Skull } from "lucide-react";
import type { SuggestedActionsByMode, PlayerActionMode } from "@/store/useGameStore";

interface ActionBarProps {
  error: string | null;
  isLoading: boolean;
  isDead: boolean;
  suggestedActionsByMode: SuggestedActionsByMode;
  input: string;
  isLowHp: boolean;
  worldTone?: string;
  onInputChange: (value: string) => void;
  onSend: (message: string) => void;
  onRetry: () => void;
  onRestart: () => void;
}

// The four action modes, shown as a fanned hand of cards. `sym` is the little
// tarot-style corner glyph; the suit colour comes from the .ahud-suit-* class.
interface ModeMeta { id: PlayerActionMode; emoji: string; sym: string; label: string; }
const MODE_META: ModeMeta[] = [
  { id: "speak", emoji: "💬", sym: "❋", label: "พูด" },
  { id: "think", emoji: "💭", sym: "☾", label: "คิด" },
  { id: "act", emoji: "⚔️", sym: "✠", label: "ทำ" },
  { id: "investigate", emoji: "🔍", sym: "✧", label: "สำรวจ" },
];
const MODE_LABEL: Record<PlayerActionMode, string> = { speak: "💬 พูด", think: "💭 คิด", act: "⚔️ ทำ", investigate: "🔍 สำรวจ" };

// Fan the cards out along a shallow arc — angle per card, centred on zero.
function fanAngles(n: number): number[] {
  const step = Math.min(15, 44 / Math.max(n, 1));
  const start = -((n - 1) / 2) * step;
  return Array.from({ length: n }, (_, i) => start + i * step);
}
const cardStyle = (angle: number, i: number): CSSProperties =>
  ({ "--ahud-angle": `${angle}deg`, "--ahud-i": i } as CSSProperties);

// ---- Dead panel (unchanged) ----
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
type View = "ready" | "modes" | "choices";

export default function ActionBar({
  error,
  isLoading,
  isDead,
  suggestedActionsByMode,
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
  const freeInputRef = useRef<HTMLInputElement>(null);

  // The HUD is a small state machine: a floating sigil ("your turn") that the player taps to
  // fan out the mode cards; picking a mode fans out that mode's choices; the sigil shrinks into
  // a back button. Free-text is a card ("พิมพ์เอง") that reveals an input.
  const [view, setView] = useState<View>("ready");
  const [selectedMode, setSelectedMode] = useState<PlayerActionMode>("act");
  const [showInput, setShowInput] = useState(false);

  // Each new turn collapses back to the floating sigil (the "your turn" beat). Adjust state
  // during render on the prop change — no setState-in-effect.
  const [prevByMode, setPrevByMode] = useState(suggestedActionsByMode);
  if (suggestedActionsByMode !== prevByMode) {
    setPrevByMode(suggestedActionsByMode);
    setView("ready");
    setShowInput(false);
  }

  // Remounting the fan on this key replays the CSS deal-in animation for each new set of cards.
  const fanKey = view === "choices" ? `c-${selectedMode}` : view;
  const choices = suggestedActionsByMode[selectedMode] ?? [];

  // Leaving the free-text card for any other card cancels the half-typed input entirely.
  const cancelTyping = () => { setShowInput(false); if (input) onInputChange(""); };
  const goModes = () => { cancelTyping(); setView("modes"); };
  const pickMode = (id: PlayerActionMode) => { setSelectedMode(id); cancelTyping(); setView("choices"); };
  const fireChoice = (text: string) => { cancelTyping(); onSend(`[${selectedMode}]: ${text}`); };
  const openType = () => { setShowInput(true); requestAnimationFrame(() => freeInputRef.current?.focus()); };
  const sigilClick = () => {
    if (isLoading) return;
    if (view === "ready") goModes();
    else if (view === "choices") goModes();
    else setView("ready");
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    inputHistoryRef.current.push(text);
    historyIdxRef.current = -1;
    onSend(`[${selectedMode}]: ${text}`);
  };

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

  // Keyboard: number keys pick the visible cards; Esc steps back.
  useEffect(() => {
    if (isLoading || isDead) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") { sigilClick(); return; }
      const idx = Number.parseInt(e.key, 10) - 1;
      if (idx < 0) return;
      if (view === "modes" && idx < MODE_META.length) pickMode(MODE_META[idx].id);
      else if (view === "choices") {
        if (idx < choices.length) fireChoice(choices[idx]);
        else if (idx === choices.length) openType();
      }
    };
    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  });

  let discMod = "";
  if (isLoading) discMod = " is-loading";
  else if (view !== "ready") discMod = " is-small";
  const discClass = `ahud-disc${discMod}`;

  let ctaText: React.ReactNode;
  let glyph: string;
  if (isLoading) { ctaText = "GM กำลังเล่าเรื่อง…"; glyph = "…"; }
  else if (view === "ready") { ctaText = <>ตาของคุณ<small>แตะเพื่อเลือกการกระทำ</small></>; glyph = "✦"; }
  else { ctaText = "ย้อน"; glyph = "‹"; }

  const modeAngles = fanAngles(MODE_META.length);
  const choiceAngles = fanAngles(choices.length + 1);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-3">
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
        <div className="ahud-stack">
          {view !== "ready" && !isLoading && (
            <div className="ahud-title">{view === "modes" ? "เลือกสิ่งที่จะทำ" : MODE_LABEL[selectedMode]}</div>
          )}

          {/* the fan of cards */}
          {view === "modes" && !isLoading && (
            <div key={fanKey} className="ahud-fan">
              {MODE_META.map((m, i) => {
                const count = suggestedActionsByMode[m.id].length;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`ahud-card ahud-suit-${m.id}`}
                    style={cardStyle(modeAngles[i], i)}
                    onClick={() => pickMode(m.id)}
                  >
                    <span className="ahud-suitbar" />
                    <span className="ahud-corner tl">{m.sym}</span>
                    <span className="ahud-mode-face">
                      <span className="g">{m.emoji}</span>
                      <span className="n">{m.label}</span>
                    </span>
                    {count > 0 && <span className="ahud-corner br">{count}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {view === "choices" && !isLoading && (
            <div key={fanKey} className="ahud-fan">
              {choices.map((c, i) => (
                <button
                  key={`${selectedMode}-${i}-${c.slice(0, 10)}`}
                  type="button"
                  className={`ahud-card ahud-suit-${selectedMode}`}
                  style={cardStyle(choiceAngles[i], i)}
                  onClick={() => fireChoice(c)}
                >
                  <span className="ahud-suitbar" />
                  <span className="ahud-corner tl">{i + 1}</span>
                  <span className="ahud-ch-txt">{c}</span>
                  <span className="ahud-ch-emblem">{MODE_META.find((m) => m.id === selectedMode)?.sym}</span>
                </button>
              ))}
              <button
                type="button"
                className="ahud-card is-type"
                style={cardStyle(choiceAngles[choices.length], choices.length)}
                onClick={openType}
              >
                <span className="ahud-ch-txt"><span className="big">✍️</span>พิมพ์เอง</span>
              </button>
            </div>
          )}

          {/* the reused bubble: floating sigil ↔ back button */}
          <button type="button" className="ahud-sigil" onClick={sigilClick} disabled={isLoading} aria-label={view === "ready" ? "ถึงตาคุณ — เลือกการกระทำ" : "ย้อนกลับ"}>
            <span className={discClass}>
              <span className="ahud-ring" />
              {view === "ready" && !isLoading && <span className="ahud-pulse" />}
              <span className="ahud-glyph">{glyph}</span>
            </span>
            <span className="ahud-cta">{ctaText}</span>
          </button>

          {/* contextual free-text (revealed by the "พิมพ์เอง" card) */}
          {showInput && view === "choices" && !isLoading && (
            <form onSubmit={handleSubmit} className="ahud-rise flex gap-3 mt-4 w-full max-w-[560px]">
              <input
                ref={freeInputRef}
                type="text"
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`${MODE_LABEL[selectedMode]} — พิมพ์เอง…`}
                className={`flex-1 bg-theme-bg border ${isLowHp ? "border-red-900/50 focus:border-red-500" : "border-theme-border focus:border-theme-accent/60"} rounded-xl px-4 py-3 text-theme-text focus:outline-none transition-colors placeholder:text-theme-muted/50`}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-theme-accent text-theme-bg font-bold rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-[0_0_20px_var(--theme-accent-glow)]"
              >
                <Send size={15} /> ส่ง
              </button>
            </form>
          )}

          {/* footer: skip the turn + a hint, only while a fan is open */}
          {view !== "ready" && !isLoading && (
            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => onSend("[no response]")}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-theme-border/60 text-theme-muted hover:text-theme-text hover:border-theme-border transition-colors text-xs"
              >
                🚫 นิ่งเฉย (ข้ามตา)
              </button>
              <span className="text-xs text-theme-muted/70">กด [1]-[4] เพื่อหยิบไพ่ · Esc ย้อน</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
