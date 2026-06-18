import { useRef, useEffect, useState } from "react";
import { ImageOff, RefreshCw, Backpack } from "lucide-react";
import { PlayerStatus, WorldConfig } from "@/store/useGameStore";
import { buildCharacterPortraitUrl } from "@/lib/gameText";
import InventoryModal from "./InventoryModal";

function CharacterPortrait({ character, genre, tone }: Readonly<{ character: string; genre: string; tone?: string }>) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const src = buildCharacterPortraitUrl(character, genre, tone);

  return (
    <div className="relative w-full aspect-[3/4] overflow-hidden bg-stone-900">
      {status !== "error" && (
        <img
          key={attempt}
          src={src}
          alt="Character portrait"
          className={`w-full h-full object-cover transition-opacity duration-500 ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      )}
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border border-stone-600 border-t-stone-400 rounded-full animate-spin" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <ImageOff size={16} className="text-stone-700" />
          <button
            onClick={() => { setStatus("loading"); setAttempt(a => a + 1); }}
            className="flex items-center gap-1 text-[10px] text-stone-600 hover:text-stone-400 transition-colors"
          >
            <RefreshCw size={9} /> retry
          </button>
        </div>
      )}
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-stone-950 to-transparent" />
    </div>
  );
}

function StatBar({ value, max, color }: Readonly<{ value: number; max: number; color: string }>) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-1 bg-stone-800">
      <div className={`h-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-stone-600 mb-2">
      {children}
    </p>
  );
}

function LivesDisplay({ tone, livesLeft }: Readonly<{ tone?: string; livesLeft: number }>) {
  if (tone === "hardcore") {
    return <span className="text-[9px] tracking-widest uppercase text-red-900/80 border border-red-900/40 px-1.5 py-0.5">permadeath</span>;
  }
  return (
    <span className="text-stone-300 tabular-nums">
      {livesLeft > 0
        ? Array.from({ length: livesLeft }, (_, i) => <span key={i} className="text-stone-500 mr-0.5">◆</span>)
        : <span className="text-red-900/60">—</span>
      }
    </span>
  );
}

interface CharacterSidebarProps {
  worldConfig: WorldConfig | null;
  currentObjective: string;
  playerStatus: PlayerStatus;
  hpPercent: number;
  isLowHp: boolean;
  livesLeft: number;
}

export default function CharacterSidebar({
  worldConfig,
  currentObjective,
  playerStatus,
  hpPercent,
  isLowHp,
  livesLeft,
}: Readonly<CharacterSidebarProps>) {
  const prevInventoryRef = useRef<string[]>(playerStatus.inventory);
  const [newItems, setNewItems] = useState<Set<string>>(new Set());
  const [inventoryOpen, setInventoryOpen] = useState(false);

  useEffect(() => {
    const prev = prevInventoryRef.current;
    const curr = playerStatus.inventory;
    const added = curr.filter((item) => !prev.includes(item));
    if (added.length > 0) {
      setNewItems((s) => new Set([...s, ...added]));
      const timer = setTimeout(() => {
        setNewItems((s) => {
          const next = new Set(s);
          added.forEach((item) => next.delete(item));
          return next;
        });
      }, 2000);
      prevInventoryRef.current = curr;
      return () => clearTimeout(timer);
    }
    prevInventoryRef.current = curr;
  }, [playerStatus.inventory]);

  return (
    <div className={`hidden lg:flex w-72 flex-col overflow-y-auto border-l transition-colors duration-500 ${isLowHp ? "border-red-950" : "border-stone-800"} bg-stone-950`}>

      {/* Portrait */}
      {worldConfig?.character && worldConfig?.genre && (
        <CharacterPortrait character={worldConfig.character} genre={worldConfig.genre} tone={worldConfig.tone} />
      )}

      <div className="flex flex-col gap-0 px-4 py-4 flex-1">

        {/* Character name / description */}
        <div className="mb-5">
          <p className="text-xs text-stone-300 leading-relaxed line-clamp-3">
            {worldConfig?.character || "—"}
          </p>
          <p className="text-[10px] text-stone-700 mt-1 leading-snug">
            {worldConfig?.genre}
          </p>
        </div>

        {/* Objective */}
        {currentObjective && (
          <div className="mb-5 border-l-2 border-amber-900/50 pl-3">
            <SectionLabel>Objective</SectionLabel>
            <p className="text-xs text-amber-200/70 leading-relaxed">{currentObjective}</p>
          </div>
        )}

        {/* Vitals */}
        <div className="mb-5">
          <SectionLabel>Vitals</SectionLabel>
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className={isLowHp ? "text-red-600" : "text-stone-500"}>HP</span>
                <span className={`tabular-nums ${isLowHp ? "text-red-500" : "text-stone-300"}`}>
                  {playerStatus.hp} / {playerStatus.max_hp}
                </span>
              </div>
              <StatBar value={playerStatus.hp} max={playerStatus.max_hp} color={isLowHp ? "bg-red-700 animate-pulse" : "bg-red-900"} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-500">Mana</span>
                <span className="text-stone-300 tabular-nums">{playerStatus.mana} / {playerStatus.max_mana}</span>
              </div>
              <StatBar value={playerStatus.mana} max={playerStatus.max_mana} color="bg-indigo-900" />
            </div>
          </div>
        </div>

        {/* Progression */}
        <div className="mb-5">
          <SectionLabel>Progression</SectionLabel>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-stone-500">Lv {playerStatus.level}</span>
            <span className="text-stone-400 tabular-nums">{playerStatus.exp} / 100 exp</span>
          </div>
          <StatBar value={playerStatus.exp} max={100} color="bg-amber-900" />
          <div className="flex justify-between items-center text-xs mt-2.5">
            <span className="text-stone-500">Lives</span>
            <LivesDisplay tone={worldConfig?.tone} livesLeft={livesLeft} />
          </div>
        </div>

        {/* Conditions */}
        {playerStatus.status_effects.length > 0 && (
          <div className="mb-5">
            <SectionLabel>Conditions</SectionLabel>
            <div className="flex flex-col gap-1">
              {playerStatus.status_effects.map((effect, i) => (
                <span
                  key={i}
                  className={`text-xs leading-snug ${
                    effect.includes("บาดแผล") || effect.includes("เลือด") || effect.includes("ไหม้") || effect.includes("พิษ")
                      ? "text-red-700"
                      : "text-stone-500"
                  }`}
                >
                  — {effect}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {playerStatus.skills.length > 0 && (
          <div className="mb-5">
            <SectionLabel>Skills</SectionLabel>
            <div className="flex flex-col gap-1">
              {playerStatus.skills.map((skill, i) => (
                <span key={i} className="text-xs text-stone-500">— {skill}</span>
              ))}
            </div>
          </div>
        )}

        {/* Inventory */}
        <div className="flex-1">
          <SectionLabel>Inventory</SectionLabel>
          <button
            type="button"
            onClick={() => setInventoryOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-stone-800 bg-stone-900/50 hover:border-amber-900/60 hover:bg-stone-900 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Backpack size={12} className="text-stone-600 group-hover:text-amber-600 transition-colors" />
              <span className="text-xs text-stone-500 group-hover:text-stone-300 transition-colors">
                {playerStatus.inventory.length > 0 ? `${playerStatus.inventory.length} items` : "empty"}
              </span>
            </div>
            {newItems.size > 0 && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 animate-pulse">new</span>
            )}
          </button>
        </div>

      </div>

      <InventoryModal
        isOpen={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
        inventory={playerStatus.inventory}
        newItems={newItems}
      />
    </div>
  );
}
