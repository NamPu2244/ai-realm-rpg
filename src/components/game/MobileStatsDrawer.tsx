"use client";

import { useEffect, useRef } from "react";
import { PlayerStatus, WorldConfig } from "@/store/useGameStore";

interface MobileStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  playerStatus: PlayerStatus;
  hpPercent: number;
  isLowHp: boolean;
  livesLeft: number;
  currentObjective: string;
  worldConfig: WorldConfig | null;
}

export default function MobileStatsDrawer({
  isOpen,
  onClose,
  playerStatus,
  hpPercent,
  isLowHp,
  livesLeft,
  currentObjective,
  worldConfig,
}: Readonly<MobileStatsDrawerProps>) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    globalThis.addEventListener("keydown", handleKey);
    return () => globalThis.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-stone-950/98 border-t border-amber-900/30 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out max-h-[80vh] overflow-y-auto ${isOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-900/20 sticky top-0 bg-stone-950/98">
          <h2 className="text-sm font-bold text-amber-400/80 uppercase tracking-widest">สถานะตัวละคร</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-amber-100/40 hover:text-amber-200 text-sm px-2 py-1 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Character Info */}
          <div className="bg-stone-900/60 border border-amber-900/20 rounded-xl p-3">
            <p className="text-xs text-amber-400/60 uppercase tracking-widest mb-1">🧙 ตัวละคร</p>
            <p className="text-xs text-amber-50/70 leading-relaxed">{worldConfig?.character || "ไม่มีข้อมูล"}</p>
            <p className="text-xs text-amber-100/30 mt-0.5">{worldConfig?.genre}</p>
          </div>

          {/* Objective */}
          {currentObjective && (
            <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-3">
              <p className="text-xs text-amber-400/60 uppercase tracking-widest mb-1">🎯 เป้าหมาย</p>
              <p className="text-sm text-amber-200/90 leading-relaxed">{currentObjective}</p>
            </div>
          )}

          {/* Vitals */}
          <div className="bg-stone-900/60 border border-amber-900/20 rounded-xl p-3 space-y-3">
            <p className="text-xs text-amber-400/60 uppercase tracking-widest">❤️ สถานะร่างกาย</p>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-rose-400 font-medium">HP</span>
                <span className="text-amber-50/70">{playerStatus.hp} / {playerStatus.max_hp}</span>
              </div>
              <div className={`w-full bg-stone-950/60 rounded-full h-2.5 border overflow-hidden ${isLowHp ? "border-red-800/50" : "border-amber-900/20"}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isLowHp ? "bg-red-600 animate-pulse" : "bg-gradient-to-r from-rose-600 to-rose-400"}`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-sky-400 font-medium">Mana</span>
                <span className="text-amber-50/70">{playerStatus.mana} / {playerStatus.max_mana}</span>
              </div>
              <div className="w-full bg-stone-950/60 rounded-full h-2.5 border border-amber-900/20 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-600 to-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${playerStatus.max_mana > 0 ? (playerStatus.mana / playerStatus.max_mana) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Progression */}
          <div className="bg-stone-900/60 border border-amber-900/20 rounded-xl p-3 space-y-2">
            <p className="text-xs text-amber-400/60 uppercase tracking-widest">⭐ Progression</p>
            <div className="flex justify-between text-sm">
              <span className="text-amber-400 font-medium">Level {playerStatus.level}</span>
              <span className="text-amber-50/70">EXP: {playerStatus.exp}/100</span>
            </div>
            <div className="w-full bg-stone-950/60 rounded-full h-2 border border-amber-900/20 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (playerStatus.exp / 100) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-pink-400">Lives</span>
              <span>{"❤️".repeat(Math.max(0, livesLeft))}</span>
            </div>
          </div>

          {/* Status Effects */}
          {playerStatus.status_effects.length > 0 && (
            <div className="bg-stone-900/60 border border-amber-900/20 rounded-xl p-3">
              <p className="text-xs text-amber-400/60 uppercase tracking-widest mb-2">✨ สถานะ</p>
              <div className="flex flex-wrap gap-2">
                {playerStatus.status_effects.map((effect, i) => (
                  <span
                    key={i}
                    className={`px-2.5 py-1 text-xs border rounded-full ${effect.includes("บาดแผล") || effect.includes("เลือด") || effect.includes("ไหม้") ? "bg-red-950/30 text-red-400 border-red-700/40" : "bg-yellow-900/20 text-yellow-400 border-yellow-700/40"}`}
                  >
                    {effect}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {playerStatus.skills.length > 0 && (
            <div className="bg-stone-900/60 border border-amber-900/20 rounded-xl p-3">
              <p className="text-xs text-amber-400/60 uppercase tracking-widest mb-2">🔮 Skills</p>
              <div className="flex flex-wrap gap-2">
                {playerStatus.skills.map((skill, i) => (
                  <span key={i} className="px-2.5 py-1 text-xs bg-purple-900/20 border border-purple-700/40 text-purple-300 rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Inventory */}
          <div className="bg-stone-900/60 border border-amber-900/20 rounded-xl p-3 pb-5">
            <p className="text-xs text-amber-400/60 uppercase tracking-widest mb-2">🎒 Inventory</p>
            {playerStatus.inventory.length > 0 ? (
              <ul className="space-y-1.5">
                {playerStatus.inventory.map((item, i) => (
                  <li key={i} className="text-sm px-3 py-2 bg-stone-950/40 border border-amber-900/20 rounded-lg text-amber-50/80">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-amber-100/30 italic">กระเป๋าว่างเปล่า</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
