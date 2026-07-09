import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import type { Variants } from "motion/react";
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

// The four action modes, shown as a fanned hand of cards. `sym` is the tarot-style corner glyph.
interface ModeMeta { id: PlayerActionMode; emoji: string; sym: string; label: string; }
const MODE_META: ModeMeta[] = [
  { id: "speak", emoji: "💬", sym: "❋", label: "พูด" },
  { id: "think", emoji: "💭", sym: "☾", label: "คิด" },
  { id: "act", emoji: "⚔️", sym: "✠", label: "ทำ" },
  { id: "investigate", emoji: "🔍", sym: "✧", label: "สำรวจ" },
];
const MODE_LABEL: Record<PlayerActionMode, string> = { speak: "💬 พูด", think: "💭 คิด", act: "⚔️ ทำ", investigate: "🔍 สำรวจ" };

// Fan the cards along a shallow arc — angle per card, centred on zero.
function fanAngles(n: number): number[] {
  const step = Math.min(15, 44 / Math.max(n, 1));
  const start = -((n - 1) / 2) * step;
  return Array.from({ length: n }, (_, i) => start + i * step);
}

const fanWrap: CSSProperties = { position: "absolute", bottom: 0, width: "100%", height: 208, display: "flex", justifyContent: "center", alignItems: "flex-end" };
const cardOrigin: CSSProperties = { transformOrigin: "50% 270%" };

// Motion: the fan deals its cards in with a staggered spring; on view change the old fan's
// cards actually animate OUT (the thing pure CSS couldn't do cleanly).
const fanV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } },
  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};
const cardV: Variants = {
  hidden: { opacity: 0, y: 70, rotate: 0, scale: 0.9 },
  show: (angle: number) => ({ opacity: 1, y: 0, rotate: angle, scale: 1, transition: { type: "spring", stiffness: 240, damping: 22 } }),
  exit: { opacity: 0, y: 46, scale: 0.9, transition: { duration: 0.2, ease: "easeIn" } },
};
const hoverLift = { y: -30, scale: 1.06, transition: { type: "spring" as const, stiffness: 400, damping: 18 } };

// ---- Dead panel (unchanged) ----
function DeadPanel({ worldTone, onRestart }: Readonly<{ worldTone?: string; onRestart: () => void }>) {
  if (worldTone === "hardcore") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-2 w-full py-3 bg-neutral-950/80 border border-red-900/60 rounded-xl text-center">
          <Skull size={16} className="text-red-700" />
          <span className="text-red-600/90 font-bold tracking-widest text-sm">ตายถาวร — การเดินทางของเจ้าจบลง</span>
        </div>
        <button onClick={onRestart} className="flex items-center justify-center gap-2 w-full py-3 bg-stone-900/80 hover:bg-stone-800 text-stone-300 border border-stone-700 font-bold rounded-xl tracking-widest transition-colors text-sm">
          เริ่มการเดินทางใหม่
        </button>
      </div>
    );
  }
  return (
    <button onClick={onRestart} className="flex items-center justify-center gap-2 w-full py-4 bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-700 font-bold rounded-xl tracking-widest transition-colors shadow-[0_0_30px_rgba(220,38,38,0.5)]">
      <Skull size={18} /> เจ้าได้ตายแล้ว — เกิดใหม่
    </button>
  );
}

// ---- Main component ----
type View = "ready" | "modes" | "choices";

export default function ActionBar({
  error, isLoading, isDead, suggestedActionsByMode, input, isLowHp, worldTone,
  onInputChange, onSend, onRetry, onRestart,
}: Readonly<ActionBarProps>) {
  const inputHistoryRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const freeInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<View>("ready");
  const [selectedMode, setSelectedMode] = useState<PlayerActionMode>("act");
  const [showInput, setShowInput] = useState(false);

  // Each new turn collapses back to the floating sigil (the "your turn" beat).
  const [prevByMode, setPrevByMode] = useState(suggestedActionsByMode);
  if (suggestedActionsByMode !== prevByMode) {
    setPrevByMode(suggestedActionsByMode);
    setView("ready");
    setShowInput(false);
  }

  const choices = suggestedActionsByMode[selectedMode] ?? [];

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

  let ctaText: React.ReactNode;
  let glyph: string;
  if (isLoading) { ctaText = "GM กำลังเล่าเรื่อง…"; glyph = "…"; }
  else if (view === "ready") { ctaText = <>ตาของคุณ<small>แตะเพื่อเลือกการกระทำ</small></>; glyph = "✦"; }
  else { ctaText = "ย้อน"; glyph = "‹"; }

  const discSize = view === "ready" ? 88 : 52;
  const floating = view === "ready" && !isLoading;
  const modeAngles = fanAngles(MODE_META.length);
  const choiceAngles = fanAngles(choices.length + 1);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-3">
      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-950/40 border border-red-800/50 rounded-xl text-sm text-red-300">
          <span>⚠️ {error}</span>
          <button onClick={onRetry} disabled={isLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/60 hover:bg-red-800 border border-red-700 rounded-lg text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-50">
            <RotateCcw size={12} /> {isLoading ? "..." : "ลองใหม่"}
          </button>
        </div>
      )}

      {isDead ? (
        <DeadPanel worldTone={worldTone} onRestart={onRestart} />
      ) : (
        <MotionConfig reducedMotion="user">
          <div className="ahud-stack">
            <AnimatePresence>
              {view !== "ready" && !isLoading && (
                <motion.div key="title" className="ahud-title" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {view === "modes" ? "เลือกสิ่งที่จะทำ" : MODE_LABEL[selectedMode]}
                </motion.div>
              )}
            </AnimatePresence>

            {/* fan viewport — collapses to nothing when idle (so the HUD barely covers the
                story), springs open when a hand is dealt. AnimatePresence swaps the fans with a real exit. */}
            <motion.div
              animate={{ height: view === "ready" ? 0 : 208 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center", alignItems: "flex-end" }}
            >
              <AnimatePresence mode="popLayout">
                {view === "modes" && !isLoading && (
                  <motion.div key="modes" variants={fanV} initial="hidden" animate="show" exit="exit" style={fanWrap}>
                    {MODE_META.map((m, i) => {
                      const count = suggestedActionsByMode[m.id].length;
                      return (
                        <motion.button
                          key={m.id} type="button" className={`ahud-card ahud-suit-${m.id}`}
                          custom={modeAngles[i]} variants={cardV} whileHover={hoverLift} whileTap={{ scale: 0.97 }}
                          style={cardOrigin} onClick={() => pickMode(m.id)}
                        >
                          <span className="ahud-suitbar" />
                          <span className="ahud-corner tl">{m.sym}</span>
                          <span className="ahud-mode-face"><span className="g">{m.emoji}</span><span className="n">{m.label}</span></span>
                          {count > 0 && <span className="ahud-corner br">{count}</span>}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}

                {view === "choices" && !isLoading && (
                  <motion.div key={`choices-${selectedMode}`} variants={fanV} initial="hidden" animate="show" exit="exit" style={fanWrap}>
                    {choices.map((c, i) => (
                      <motion.button
                        key={`${selectedMode}-${i}-${c.slice(0, 10)}`} type="button" className={`ahud-card ahud-suit-${selectedMode}`}
                        custom={choiceAngles[i]} variants={cardV} whileHover={hoverLift} whileTap={{ scale: 0.97 }}
                        style={cardOrigin} onClick={() => fireChoice(c)}
                      >
                        <span className="ahud-suitbar" />
                        <span className="ahud-corner tl">{i + 1}</span>
                        <span className="ahud-ch-txt">{c}</span>
                        <span className="ahud-ch-emblem">{MODE_META.find((m) => m.id === selectedMode)?.sym}</span>
                      </motion.button>
                    ))}
                    <motion.button
                      key="type" type="button" className="ahud-card is-type"
                      custom={choiceAngles[choices.length]} variants={cardV} whileHover={hoverLift} whileTap={{ scale: 0.97 }}
                      style={cardOrigin} onClick={openType}
                    >
                      <span className="ahud-ch-txt"><span className="big">✍️</span>พิมพ์เอง</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* the reused bubble: floating sigil ↔ back button (Framer drives float + size morph) */}
            <motion.button type="button" className="ahud-sigil" onClick={sigilClick} disabled={isLoading}
              whileHover={isLoading ? undefined : { scale: 1.05 }} whileTap={isLoading ? undefined : { scale: 0.95 }}
              aria-label={view === "ready" ? "ถึงตาคุณ — เลือกการกระทำ" : "ย้อนกลับ"}
            >
              <motion.span
                className={`ahud-disc${isLoading ? " is-loading" : ""}`}
                animate={{ width: discSize, height: discSize, y: floating ? [0, -8, 0] : 0 }}
                transition={{
                  width: { type: "spring", stiffness: 300, damping: 26 },
                  height: { type: "spring", stiffness: 300, damping: 26 },
                  y: { repeat: floating ? Infinity : 0, duration: 3.6, ease: "easeInOut" },
                }}
              >
                <span className="ahud-ring" />
                {floating && <span className="ahud-pulse" />}
                <span className="ahud-glyph" style={{ fontSize: view === "ready" ? 28 : 24 }}>{glyph}</span>
              </motion.span>
              <span className="ahud-cta">{ctaText}</span>
            </motion.button>

            {/* contextual free-text (revealed by the "พิมพ์เอง" card) */}
            <AnimatePresence>
              {showInput && view === "choices" && !isLoading && (
                <motion.form
                  onSubmit={handleSubmit}
                  className="flex gap-3 mt-4 w-full max-w-[560px] overflow-hidden"
                  initial={{ opacity: 0, height: 0, y: -8 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <input
                    ref={freeInputRef} type="text" value={input}
                    onChange={(e) => onInputChange(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder={`${MODE_LABEL[selectedMode]} — พิมพ์เอง…`}
                    className={`flex-1 bg-theme-bg border ${isLowHp ? "border-red-900/50 focus:border-red-500" : "border-theme-border focus:border-theme-accent/60"} rounded-xl px-4 py-3 text-theme-text focus:outline-none transition-colors placeholder:text-theme-muted/50`}
                  />
                  <button type="submit" disabled={!input.trim()} className="flex items-center gap-2 px-6 py-3 bg-theme-accent text-theme-bg font-bold rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-[0_0_20px_var(--theme-accent-glow)]">
                    <Send size={15} /> ส่ง
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* footer: skip the turn + a hint, only while a fan is open */}
            {view !== "ready" && !isLoading && (
              <div className="flex items-center gap-3 mt-4">
                <button type="button" onClick={() => onSend("[no response]")} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-theme-border/60 text-theme-muted hover:text-theme-text hover:border-theme-border transition-colors text-xs">
                  🚫 นิ่งเฉย (ข้ามตา)
                </button>
                <span className="text-xs text-theme-muted/70">กด [1]-[4] เพื่อหยิบไพ่ · Esc ย้อน</span>
              </div>
            )}
          </div>
        </MotionConfig>
      )}
    </div>
  );
}
