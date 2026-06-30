"use client";

import { useEffect, useRef, useState } from "react";
import type { WorldConfig } from "@/store/useGameStore";

interface Props {
  config: WorldConfig;
  prologue: string | null; // null = AI still working
  onEnter: () => void;
  onRetry?: () => void;
}

const TONE_STYLES: Record<string, { line: string; accent: string; glow: string; dot: string }> = {
  hardcore: { line: "bg-red-900/40",    accent: "text-red-500/60",    glow: "from-red-950/30",    dot: "bg-red-800"    },
  balanced: { line: "bg-amber-900/30",  accent: "text-amber-500/60",  glow: "from-amber-950/20",  dot: "bg-amber-800"  },
  story:    { line: "bg-amber-800/30",  accent: "text-amber-400/60",  glow: "from-amber-900/20",  dot: "bg-amber-700"  },
  sandbox:  { line: "bg-purple-900/30", accent: "text-purple-500/60", glow: "from-purple-950/20", dot: "bg-purple-800" },
};

function toGenreLabel(genre: string): string {
  const g = genre.toLowerCase();
  if (g.includes("cyberpunk")) return "CYBERPUNK";
  if (g.includes("fantasy")) return "HIGH FANTASY";
  if (g.includes("science") || g.includes("space") || g.includes("sci-fi")) return "SCIENCE FICTION";
  if (g.includes("horror")) return "HORROR";
  if (g.includes("apocalypse")) return "POST-APOCALYPTIC";
  if (g.includes("wuxia") || g.includes("martial")) return "WUXIA";
  if (g.includes("modern") || g.includes("urban")) return "MODERN";
  return "RPG";
}

export default function WorldLoadingScreen({ config, prologue, onEnter, onRetry }: Readonly<Props>) {
  const s = TONE_STYLES[config.tone] ?? TONE_STYLES.balanced;
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasEnteredRef = useRef(false);

  const handleEnter = () => {
    if (hasEnteredRef.current) return;
    hasEnteredRef.current = true;
    if (autoRef.current) clearTimeout(autoRef.current);
    setLeaving(true);
    setTimeout(onEnter, 900);
  };

  // Typewriter effect when prologue arrives
  useEffect(() => {
    if (prologue === null) return;

    if (!prologue) {
      const t = setTimeout(() => setDone(true), 0);
      autoRef.current = setTimeout(handleEnter, 1500);
      return () => clearTimeout(t);
    }

    const chars = [...prologue]; // Unicode-safe split
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(i + 3, chars.length);
      setTyped(chars.slice(0, i).join(""));
      if (i >= chars.length) {
        clearInterval(id);
        setDone(true);
        autoRef.current = setTimeout(handleEnter, 5000);
      }
    }, 16);

    return () => {
      clearInterval(id);
      if (autoRef.current) clearTimeout(autoRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prologue]);

  // Show retry button after 25 s if prologue never arrives (AI stalled)
  useEffect(() => {
    if (prologue !== null) {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      const t = setTimeout(() => setShowRetry(false), 0);
      return () => clearTimeout(t);
    }
    retryTimerRef.current = setTimeout(() => setShowRetry(true), 25000);
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [prologue]);

  useEffect(() => () => {
    if (autoRef.current) clearTimeout(autoRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, []);

  const genreLabel = toGenreLabel(config.genre);
  const title = config.worldName || genreLabel;
  const tag = config.worldName ? genreLabel : null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-1000 ${leaving ? "opacity-0 pointer-events-none" : "opacity-100"}`}
    >
      {/* Backgrounds */}
      <div className="absolute inset-0 bg-stone-950" />
      <div className={`absolute inset-0 bg-gradient-to-b ${s.glow} via-transparent to-black/60`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent,rgba(0,0,0,0.6))]" />

      <div className="relative z-10 max-w-lg w-full mx-auto px-8 flex flex-col items-center gap-8 text-center">
        {/* Title */}
        <div className="space-y-1">
          {tag && <p className={`text-[10px] tracking-[0.5em] uppercase ${s.accent}`}>{tag}</p>}
          <h1 className="text-2xl font-bold text-neutral-200 tracking-widest">{title}</h1>
        </div>

        {/* Ornamental divider */}
        <div className="flex items-center gap-3 w-full">
          <div className={`flex-1 h-px ${s.line}`} />
          <span className={`text-xs ${s.accent}`}>✦</span>
          <div className={`flex-1 h-px ${s.line}`} />
        </div>

        {/* Main content */}
        <div className="min-h-[200px] flex items-center justify-center w-full">
          {prologue === null ? (
            // Loading state: show opening seed as teaser while AI works
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-1 h-1 rounded-full ${s.dot} animate-bounce opacity-60`}
                    style={{ animationDelay: `${i * 120}ms`, animationDuration: "700ms" }}
                  />
                ))}
              </div>
              <p className="text-xs text-neutral-600 tracking-[0.4em] uppercase">Creating World</p>
              {config.openingSeed && (
                <p className="text-sm text-neutral-500 italic leading-relaxed mt-3 max-w-sm">
                  {config.openingSeed}
                </p>
              )}
              {showRetry && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-2 text-xs text-amber-700/70 hover:text-amber-400 border border-amber-900/40 hover:border-amber-700/50 px-4 py-2 rounded-lg transition-all"
                >
                  Taking too long? Try again
                </button>
              )}
            </div>
          ) : (
            // Prologue text with typewriter
            <p className="text-sm text-neutral-300/90 leading-[2.2] italic font-serif whitespace-pre-wrap">
              {typed}
              {!done && (
                <span className="inline-block w-0.5 h-4 bg-amber-600/70 ml-0.5 align-middle animate-pulse" />
              )}
            </p>
          )}
        </div>

        {/* Enter button (appears when prologue finishes) */}
        {done && !leaving && (
          <button
            type="button"
            onClick={handleEnter}
            className={`text-[11px] tracking-[0.5em] uppercase transition-opacity hover:opacity-100 opacity-60 animate-pulse ${s.accent}`}
          >
            Enter World &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
