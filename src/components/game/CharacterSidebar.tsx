import { useRef, useEffect, useState } from "react";
import { ImageOff, RefreshCw, Backpack, Coins, Shield, Swords, Brain, Eye, MessageCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { PlayerStatus, WorldConfig, Companion, FactionStanding, OpenThread } from "@/store/useGameStore";
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
    return <span className="text-[9px] tracking-widest text-red-900/80 border border-red-900/40 px-1.5 py-0.5">ตายถาวร</span>;
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

const ATTR_META: { key: keyof PlayerStatus["attributes"]; label: string; icon: typeof Swords; color: string }[] = [
  { key: "str", label: "พลัง",   icon: Swords,       color: "text-red-400" },
  { key: "dex", label: "ว่องไว", icon: Eye,           color: "text-emerald-400" },
  { key: "int", label: "ปัญญา",  icon: Brain,         color: "text-sky-400" },
  { key: "con", label: "อึด",    icon: Shield,        color: "text-orange-400" },
  { key: "wis", label: "สติ",    icon: Eye,           color: "text-purple-400" },
  { key: "cha", label: "เสน่ห์", icon: MessageCircle, color: "text-pink-400" },
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
  if (standing >= 20)  return "text-emerald-600";
  if (standing <= -20) return "text-red-700";
  return "text-stone-600";
}

function FactionBar({ standing }: Readonly<{ standing: number }>) {
  const pct = ((standing + 100) / 200) * 100;
  return (
    <div className="w-full h-1 bg-stone-800 rounded-full overflow-hidden">
      <div className={`h-full transition-all duration-500 ${factionBarColor(standing)}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function companionHpColor(hp: number, maxHp: number): string {
  return maxHp > 0 && hp / maxHp <= 0.3 ? "bg-red-800 animate-pulse" : "bg-emerald-900";
}

function urgencyColor(urgency: OpenThread['urgency']): string {
  switch (urgency) {
    case 'critical': return 'text-red-400 animate-pulse';
    case 'high':     return 'text-orange-400';
    case 'medium':   return 'text-yellow-400';
    default:         return 'text-neutral-400';
  }
}

function urgencyLabel(urgency: OpenThread['urgency']): string {
  switch (urgency) {
    case 'critical': return 'วิกฤต';
    case 'high':     return 'สูง';
    case 'medium':   return 'ปานกลาง';
    default:         return 'ต่ำ';
  }
}

// Seconds per urgency level before the pressure bar fully depletes
const PRESSURE_SECONDS: Record<OpenThread['urgency'], number> = {
  critical: 75,
  high:     110,
  medium:   180,
  low:      300,
};

interface CharacterSidebarProps {
  worldConfig: WorldConfig | null;
  currentObjective: string;
  playerStatus: PlayerStatus;
  isLowHp: boolean;
  livesLeft: number;
  companions: Record<string, Companion>;
  factionStandings: FactionStanding[];
  openThreads: OpenThread[];
  isLoading: boolean;
}

export default function CharacterSidebar({
  worldConfig,
  currentObjective,
  playerStatus,
  isLowHp,
  livesLeft,
  companions,
  factionStandings,
  openThreads,
  isLoading,
}: Readonly<CharacterSidebarProps>) {
  const prevInventoryRef = useRef<string[]>(playerStatus.inventory);
  const [newItems, setNewItems] = useState<Set<string>>(new Set());
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [threadsExpanded, setThreadsExpanded] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [turnSeconds, setTurnSeconds] = useState(0);
  const prevLoadingRef = useRef(isLoading);

  // Count up seconds between turns; reset each time a turn completes
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      setTurnSeconds(0);
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const id = setInterval(() => setTurnSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isLoading]);

  useEffect(() => {
    const prev = prevInventoryRef.current;
    const curr = playerStatus.inventory;
    const added = curr.filter((item) => !prev.includes(item));
    if (added.length > 0) {
      setNewItems((s) => new Set([...s, ...added]));
      const clearAdded = () => setNewItems((s) => {
        const next = new Set(s);
        for (const item of added) next.delete(item);
        return next;
      });
      const timer = setTimeout(clearAdded, 2000);
      prevInventoryRef.current = curr;
      return () => clearTimeout(timer);
    }
    prevInventoryRef.current = curr;
  }, [playerStatus.inventory]);

  const activeCompanions = Object.values(companions).filter((c) => c.status === "active");
  const attrs = playerStatus.attributes;
  const hasAttrs = attrs && Object.values(attrs).some((v) => v !== 10);

  return (
    <div
      className={`hidden lg:flex flex-col border-l transition-all duration-300 ${isLowHp ? "border-red-950" : "border-stone-800"} bg-stone-950 ${isOpen ? "w-72" : "w-10"} overflow-hidden`}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        title={isOpen ? "Hide sidebar" : "Show sidebar"}
        className={`flex items-center justify-center shrink-0 h-10 w-full border-b transition-colors ${isLowHp ? "border-red-950 hover:bg-red-950/30" : "border-stone-800 hover:bg-stone-800/60"} text-stone-600 hover:text-stone-300`}
      >
        {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Content — hidden when collapsed */}
      {isOpen && (
        <>
          {worldConfig?.character && worldConfig?.genre && (
            <CharacterPortrait character={worldConfig.character} genre={worldConfig.genre} tone={worldConfig.tone} />
          )}

          <div className="flex flex-col gap-0 px-4 py-4 flex-1 overflow-y-auto">

            <div className="mb-5">
              <p className="text-xs text-stone-300 leading-relaxed line-clamp-3">{worldConfig?.character || "—"}</p>
              <p className="text-[10px] text-stone-700 mt-1 leading-snug">{worldConfig?.genre}</p>
            </div>

            {currentObjective && (
              <div className="mb-5 border-l-2 border-amber-900/50 pl-3">
                <SectionLabel>เป้าหมาย</SectionLabel>
                <p className="text-xs text-amber-200/70 leading-relaxed">{currentObjective}</p>
              </div>
            )}

            {openThreads.length > 0 && (
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => setThreadsExpanded((v) => !v)}
                  className="flex items-center justify-between w-full mb-2 group"
                >
                  <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-stone-600 group-hover:text-stone-400 transition-colors">
                    เรื่องค้างคา
                  </p>
                  <span className="text-[9px] text-stone-700 group-hover:text-stone-500 transition-colors">
                    {threadsExpanded ? '▲' : '▼'}
                  </span>
                </button>
                {threadsExpanded && (
                  <div className="flex flex-col gap-2.5">
                    {openThreads.map((thread) => {
                      const hasCountdown = thread.expires_in_turns !== null;
                      const isCritical = thread.urgency === 'critical';
                      const isHigh = thread.urgency === 'high';
                      const totalSecs = PRESSURE_SECONDS[thread.urgency];
                      const pct = hasCountdown ? Math.max(0, 100 - (turnSeconds / totalSecs) * 100) : null;
                      const mins = Math.floor(turnSeconds / 60);
                      const secs = turnSeconds % 60;

                      return (
                        <div
                          key={thread.id}
                          className={`pl-2.5 border-l-2 ${
                            isCritical ? 'border-red-600' :
                            isHigh     ? 'border-orange-600' :
                                         'border-stone-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={`text-[9px] font-bold tracking-widest ${urgencyColor(thread.urgency)}`}>
                              {urgencyLabel(thread.urgency)}
                            </span>
                            {hasCountdown && (
                              <span className={`text-[9px] tabular-nums shrink-0 font-mono ${isCritical ? 'text-red-500' : isHigh ? 'text-orange-500' : 'text-stone-600'}`}>
                                {thread.expires_in_turns}t · {mins > 0 ? `${mins}m ` : ''}{secs}s
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-stone-400 leading-snug mb-1.5">{thread.description}</p>
                          {pct !== null && (
                            <div className="w-full h-0.5 bg-stone-800 overflow-hidden">
                              <div
                                className={`h-full transition-none ${
                                  isCritical ? 'bg-red-600' : isHigh ? 'bg-orange-600' : 'bg-yellow-700'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="mb-5">
              <SectionLabel>ค่าชีพ</SectionLabel>
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={isLowHp ? "text-red-600" : "text-stone-500"}>พลังชีวิต</span>
                    <span className={`tabular-nums ${isLowHp ? "text-red-500" : "text-stone-300"}`}>
                      {playerStatus.hp} / {playerStatus.max_hp}
                    </span>
                  </div>
                  <StatBar value={playerStatus.hp} max={playerStatus.max_hp} color={isLowHp ? "bg-red-700 animate-pulse" : "bg-red-900"} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-stone-500">พลังเวท</span>
                    <span className="text-stone-300 tabular-nums">{playerStatus.mana} / {playerStatus.max_mana}</span>
                  </div>
                  <StatBar value={playerStatus.mana} max={playerStatus.max_mana} color="bg-indigo-900" />
                </div>
              </div>
            </div>

            {playerStatus.gold > 0 && (
              <div className="mb-5">
                <SectionLabel>ทอง</SectionLabel>
                <div className="flex items-center gap-1.5">
                  <Coins size={12} className="text-amber-600" />
                  <span className="text-sm text-amber-300 font-bold tabular-nums">{playerStatus.gold.toLocaleString()}</span>
                </div>
              </div>
            )}

            {attrs && hasAttrs && (
              <div className="mb-5">
                <SectionLabel>ค่าพลัง</SectionLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  {ATTR_META.map(({ key, label, color }) => (
                    <div key={key} className="flex flex-col items-center py-1.5 bg-stone-900/60 rounded border border-stone-800/60">
                      <span className={`text-[9px] font-bold tracking-widest ${color}`}>{label}</span>
                      <span className="text-xs text-stone-200 font-bold tabular-nums leading-none mt-0.5">{attrs[key]}</span>
                      <span className="text-[9px] text-stone-600 tabular-nums">{attrMod(attrs[key])}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-5">
              <SectionLabel>ความก้าวหน้า</SectionLabel>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-500">เลเวล {playerStatus.level}</span>
                <span className="text-stone-400 tabular-nums">{playerStatus.exp} / 100 ปสก.</span>
              </div>
              <StatBar value={playerStatus.exp} max={100} color="bg-amber-900" />
              <div className="flex justify-between items-center text-xs mt-2.5">
                <span className="text-stone-500">ชีวิต</span>
                <LivesDisplay tone={worldConfig?.tone} livesLeft={livesLeft} />
              </div>
            </div>

            {activeCompanions.length > 0 && (
              <div className="mb-5">
                <SectionLabel>เพื่อนร่วมทาง</SectionLabel>
                <div className="space-y-2">
                  {activeCompanions.map((c) => (
                    <div key={c.name} className="space-y-1">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-stone-300 font-medium truncate">{c.name}</span>
                        <span className="text-stone-500 tabular-nums shrink-0 ml-1">{c.hp}/{c.max_hp}</span>
                      </div>
                      <StatBar value={c.hp} max={c.max_hp} color={companionHpColor(c.hp, c.max_hp)} />
                      {c.status_effects.length > 0 && (
                        <p className="text-[9px] text-red-700/80 truncate">{c.status_effects.join(", ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {factionStandings.length > 0 && (
              <div className="mb-5">
                <SectionLabel>ฝ่าย</SectionLabel>
                <div className="space-y-2">
                  {factionStandings.map((f) => (
                    <div key={f.name} className="space-y-1">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-stone-400 truncate">{f.name}</span>
                        <span className={`text-[9px] shrink-0 ml-1 ${factionLabelColor(f.standing)}`}>
                          {f.label}
                        </span>
                      </div>
                      <FactionBar standing={f.standing} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {playerStatus.status_effects.length > 0 && (
              <div className="mb-5">
                <SectionLabel>สภาวะ</SectionLabel>
                <div className="flex flex-col gap-1">
                  {playerStatus.status_effects.map((effect) => (
                    <span
                      key={effect}
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

            {playerStatus.skills.length > 0 && (
              <div className="mb-5">
                <SectionLabel>ทักษะ</SectionLabel>
                <div className="flex flex-col gap-1">
                  {playerStatus.skills.map((skill) => (
                    <span key={skill} className="text-xs text-stone-500">— {skill}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1">
              <SectionLabel>สัมภาระ</SectionLabel>
              <button
                type="button"
                onClick={() => setInventoryOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-stone-800 bg-stone-900/50 hover:border-amber-900/60 hover:bg-stone-900 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Backpack size={12} className="text-stone-600 group-hover:text-amber-600 transition-colors" />
                  <span className="text-xs text-stone-500 group-hover:text-stone-300 transition-colors">
                    {playerStatus.inventory.length > 0 ? `${playerStatus.inventory.length} ชิ้น` : "ว่างเปล่า"}
                  </span>
                </div>
                {newItems.size > 0 && (
                  <span className="text-[9px] font-bold tracking-wider text-amber-500 animate-pulse">ใหม่</span>
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
        </>
      )}
    </div>
  );
}
