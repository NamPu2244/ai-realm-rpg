"use client";

import { useEffect, useRef, useState } from "react";
import { X, UserRound, Crosshair, Heart, TrendingUp, Sparkles, Wand2, Backpack, ChevronRight, Coins, Shield, Swords, Brain, Eye, MessageCircle, Users, Flag } from "lucide-react";
import { PlayerStatus, WorldConfig, Companion, FactionStanding } from "@/store/useGameStore";
import InventoryModal from "./InventoryModal";

interface MobileStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  playerStatus: PlayerStatus;
  hpPercent: number;
  isLowHp: boolean;
  livesLeft: number;
  currentObjective: string;
  worldConfig: WorldConfig | null;
  companions: Record<string, Companion>;
  factionStandings: FactionStanding[];
}

const ATTR_META: { key: keyof PlayerStatus["attributes"]; label: string; icon: typeof Swords; color: string }[] = [
  { key: "str", label: "STR", icon: Swords,       color: "text-red-400" },
  { key: "dex", label: "DEX", icon: Eye,           color: "text-emerald-400" },
  { key: "int", label: "INT", icon: Brain,         color: "text-sky-400" },
  { key: "con", label: "CON", icon: Shield,        color: "text-orange-400" },
  { key: "wis", label: "WIS", icon: Eye,           color: "text-purple-400" },
  { key: "cha", label: "CHA", icon: MessageCircle, color: "text-pink-400" },
];

function attrMod(val: number) {
  const mod = Math.floor((val - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function factionBarColor(standing: number): string {
  if (standing >= 60)  return "bg-emerald-600";
  if (standing >= 20)  return "bg-sky-700";
  if (standing > -20)  return "bg-stone-600";
  if (standing > -60)  return "bg-orange-700";
  return "bg-red-700";
}

function factionLabelColor(standing: number): string {
  if (standing >= 20)  return "text-emerald-400";
  if (standing <= -20) return "text-red-400";
  return "text-stone-500";
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
  companions,
  factionStandings,
}: Readonly<MobileStatsDrawerProps>) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    globalThis.addEventListener("keydown", handleKey);
    return () => globalThis.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const activeCompanions = Object.values(companions).filter((c) => c.status === "active");
  const attrs = playerStatus.attributes;
  const hasAttrs = attrs && Object.values(attrs).some((v) => v !== 10);

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
          <button type="button" onClick={onClose} className="text-amber-100/40 hover:text-amber-200 text-sm px-2 py-1 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">

          {/* Character info */}
          <div className="bg-stone-900/60 border border-amber-900/20 rounded-xl p-3">
            <p className="flex items-center gap-1.5 text-xs text-amber-400/60 uppercase tracking-widest mb-1"><UserRound size={11} /> ตัวละคร</p>
            <p className="text-xs text-amber-50/70 leading-relaxed">{worldConfig?.character || "ไม่มีข้อมูล"}</p>
            <p className="text-xs text-amber-100/30 mt-0.5">{worldConfig?.genre}</p>
          </div>

          {/* Objective */}
          {currentObjective && (
            <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-3">
              <p className="flex items-center gap-1.5 text-xs text-amber-400/60 uppercase tracking-widest mb-1"><Crosshair size={11} /> เป้าหมาย</p>
              <p className="text-sm text-amber-200/90 leading-relaxed">{currentObjective}</p>
            </div>
          )}

          {/* Vitals */}
          <div className="bg-stone-900/60 border border-amber-900/20 rounded-xl p-3 space-y-3">
            <p className="flex items-center gap-1.5 text-xs text-amber-400/60 uppercase tracking-widest"><Heart size={11} /> สถานะร่างกาย</p>
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

          {/* Gold */}
          {playerStatus.gold > 0 && (
            <div className="bg-stone-900/60 border border-amber-900/20 rounded-xl p-3">
              <p className="flex items-center gap-1.5 text-xs text-amber-400/60 uppercase tracking-widest mb-1"><Coins size={11} /> Gold</p>
              <p className="text-lg font-bold text-amber-300 tabular-nums">{playerStatus.gold.toLocaleString()}</p>
            </div>
          )}

          {/* Attributes */}
          {attrs && hasAttrs && (
            <div className="bg-stone-900/60 border border-amber-900/20 rounded-xl p-3">
              <p className="flex items-center gap-1.5 text-xs text-amber-400/60 uppercase tracking-widest mb-3"><Shield size={11} /> Attributes</p>
              <div className="grid grid-cols-3 gap-2">
                {ATTR_META.map(({ key, label, color }) => (
                  <div key={key} className="flex flex-col items-center py-1.5 bg-stone-950/60 rounded border border-stone-800/60">
                    <span className={`text-[9px] font-bold tracking-widest ${color}`}>{label}</span>
                    <span className="text-sm font-bold text-stone-200 tabular-nums leading-none mt-0.5">{attrs[key]}</span>
                    <span className="text-[10px] text-stone-600 tabular-nums">{attrMod(attrs[key])}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progression */}
          <div className="bg-stone-900/60 border border-amber-900/20 rounded-xl p-3 space-y-2">
            <p className="flex items-center gap-1.5 text-xs text-amber-400/60 uppercase tracking-widest"><TrendingUp size={11} /> Progression</p>
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
            {worldConfig?.tone === "hardcore" ? (
              <div className="flex justify-between text-sm">
                <span className="text-red-700/80">Lives</span>
                <span className="text-[10px] font-bold text-red-800/70 uppercase tracking-widest border border-red-900/40 px-2 py-0.5 rounded-full">Permadeath</span>
              </div>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-pink-400">Lives</span>
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: Math.max(0, livesLeft) }, (_, i) => (
                    <Heart key={`life-${i}`} size={11} className="text-pink-400 fill-pink-400" />
                  ))}
                </span>
              </div>
            )}
          </div>

          {/* Companions */}
          {activeCompanions.length > 0 && (
            <div className="bg-stone-900/60 border border-amber-900/20 rounded-xl p-3 space-y-3">
              <p className="flex items-center gap-1.5 text-xs text-amber-400/60 uppercase tracking-widest"><Users size={11} /> Companions</p>
              {activeCompanions.map((c) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-300 font-medium">{c.name}</span>
                    <span className="text-stone-500 tabular-nums">{c.hp}/{c.max_hp}</span>
                  </div>
                  <div className="w-full bg-stone-950/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${c.max_hp > 0 && c.hp / c.max_hp <= 0.3 ? "bg-red-600 animate-pulse" : "bg-emerald-700"}`}
                      style={{ width: `${c.max_hp > 0 ? (c.hp / c.max_hp) * 100 : 0}%` }}
                    />
                  </div>
                  {c.status_effects.length > 0 && (
                    <p className="text-[10px] text-red-500/70">{c.status_effects.join(", ")}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Factions */}
          {factionStandings.length > 0 && (
            <div className="bg-stone-900/60 border border-amber-900/20 rounded-xl p-3 space-y-2">
              <p className="flex items-center gap-1.5 text-xs text-amber-400/60 uppercase tracking-widest"><Flag size={11} /> Factions</p>
              {factionStandings.map((f) => (
                <div key={f.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-400">{f.name}</span>
                    <span className={`${factionLabelColor(f.standing)}`}>{f.label}</span>
                  </div>
                  <div className="w-full bg-stone-950/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${factionBarColor(f.standing)}`}
                      style={{ width: `${((f.standing + 100) / 200) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Status Effects */}
          {playerStatus.status_effects.length > 0 && (
            <div className="bg-stone-900/60 border border-amber-900/20 rounded-xl p-3">
              <p className="flex items-center gap-1.5 text-xs text-amber-400/60 uppercase tracking-widest mb-2"><Sparkles size={11} /> สถานะ</p>
              <div className="flex flex-wrap gap-2">
                {playerStatus.status_effects.map((effect) => (
                  <span
                    key={effect}
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
              <p className="flex items-center gap-1.5 text-xs text-amber-400/60 uppercase tracking-widest mb-2"><Wand2 size={11} /> Skills</p>
              <div className="flex flex-wrap gap-2">
                {playerStatus.skills.map((skill) => (
                  <span key={skill} className="px-2.5 py-1 text-xs bg-purple-900/20 border border-purple-700/40 text-purple-300 rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Inventory */}
          <button
            type="button"
            onClick={() => setInventoryOpen(true)}
            className="w-full flex items-center justify-between bg-stone-900/60 border border-amber-900/20 hover:border-amber-700/40 hover:bg-stone-900/80 rounded-xl p-3 transition-colors group"
          >
            <div className="flex items-center gap-1.5">
              <Backpack size={11} className="text-amber-400/60 group-hover:text-amber-400/90 transition-colors" />
              <span className="text-xs text-amber-400/60 uppercase tracking-widest group-hover:text-amber-400/90 transition-colors">Inventory</span>
              <span className="text-xs text-stone-600 ml-1">
                {playerStatus.inventory.length > 0 ? `${playerStatus.inventory.length} items` : "ว่างเปล่า"}
              </span>
            </div>
            <ChevronRight size={14} className="text-stone-600 group-hover:text-stone-400 transition-colors" />
          </button>
        </div>
      </div>

      <InventoryModal
        isOpen={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
        inventory={playerStatus.inventory}
      />
    </>
  );
}
