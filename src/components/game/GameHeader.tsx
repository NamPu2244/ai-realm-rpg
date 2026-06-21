import { RefObject, useState, useRef, useEffect } from "react";
import { Swords, BookOpen, AlertTriangle, LayoutDashboard, Save, Upload, ListRestart, Volume2, VolumeX, ScrollText, Users, Settings, MoreHorizontal } from "lucide-react";
import { AuthStatus, WorldConfig } from "@/store/useGameStore";
import { isSoundMuted, setSoundMuted } from "@/lib/sounds";

interface GameHeaderProps {
  worldConfig: WorldConfig | null;
  isLowHp: boolean;
  authStatus: AuthStatus;
  hasPersonalKey: boolean;
  timeOfDay: string;
  inWorldDate: string;
  importInputRef: RefObject<HTMLInputElement | null>;
  onOpenJournal: () => void;
  onOpenDossier: () => void;
  onExportSave: () => void;
  onExportStory: () => void;
  onImportSave: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuitToDashboard: () => void;
  onNewGame: () => void;
  onOpenSettings: () => void;
}

const ICON_BTN = "flex items-center justify-center w-8 h-8 bg-stone-900/60 hover:bg-amber-900/30 text-amber-100/60 hover:text-amber-200 border border-amber-900/30 hover:border-amber-700/50 rounded-lg transition-all hover:-translate-y-0.5";
const MENU_ITEM = "w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-100/60 hover:text-amber-200 hover:bg-amber-900/20 transition-colors";

export default function GameHeader({
  worldConfig,
  isLowHp,
  authStatus,
  hasPersonalKey,
  timeOfDay,
  inWorldDate,
  importInputRef,
  onOpenJournal,
  onOpenDossier,
  onExportSave,
  onExportStory,
  onImportSave,
  onQuitToDashboard,
  onNewGame,
  onOpenSettings,
}: Readonly<GameHeaderProps>) {
  const [muted, setMuted] = useState(() => isSoundMuted());
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggleMute = () => {
    const next = !muted;
    setSoundMuted(next);
    setMuted(next);
  };

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const close = () => setShowMenu(false);

  return (
    <header
      className={`relative z-20 px-4 py-3 border-b backdrop-blur transition-colors duration-500 ${isLowHp ? "bg-red-950/40 border-red-900/40" : "bg-stone-950/70 border-amber-900/20"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-widest bg-gradient-to-r from-amber-200 via-amber-400 to-orange-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(217,119,6,0.25)]">
            <Swords size={20} className="text-amber-400" /> STORYWEAVE
          </h1>
          <p className="text-xs text-amber-100/40 uppercase tracking-wider mt-0.5">
            {worldConfig?.language} · {worldConfig?.tone}
            {(timeOfDay || inWorldDate) && (
              <span className="text-amber-100/30 ml-2 normal-case tracking-normal">
                {[timeOfDay, inWorldDate].filter(Boolean).join(" · ")}
              </span>
            )}
            {isLowHp && (
              <span className="inline-flex items-center gap-1 text-red-400 ml-2 font-bold animate-pulse">
                <AlertTriangle size={11} /> LOW HP
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Settings — quick access with indicator dot */}
          <button
            type="button"
            onClick={onOpenSettings}
            title={hasPersonalKey ? "API Key ส่วนตัว — คลิกเพื่อจัดการ" : "ใช้ Key ส่วนกลาง — คลิกเพื่อใส่ Key ของคุณเอง"}
            className={`relative ${ICON_BTN} ${hasPersonalKey ? "" : "border-amber-700/50 text-amber-400/80"}`}
          >
            <Settings size={13} />
            {hasPersonalKey ? undefined : (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          {/* Mute toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            title={muted ? "เปิดเสียง" : "ปิดเสียง"}
            className={ICON_BTN}
          >
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>

          {/* Journal */}
          <button
            type="button"
            onClick={onOpenJournal}
            title="สมุดบันทึกนักเดินทาง"
            className={ICON_BTN}
          >
            <BookOpen size={13} />
          </button>

          {/* Dossier */}
          <button
            type="button"
            onClick={onOpenDossier}
            title="ทะเบียนตัวละคร"
            className={ICON_BTN}
          >
            <Users size={13} />
          </button>

          {/* Overflow dropdown */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((v) => !v)}
              title="เมนูเพิ่มเติม"
              className={`${ICON_BTN} ${showMenu ? "bg-amber-900/30 border-amber-700/50 text-amber-200" : ""}`}
            >
              <MoreHorizontal size={13} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-stone-900/95 border border-stone-700/80 rounded-xl shadow-2xl backdrop-blur overflow-hidden z-50 animate-[pageFadeIn_0.12s_ease-out]">
                <button type="button" onClick={() => { onExportSave(); close(); }} className={MENU_ITEM}>
                  <Save size={13} /> บันทึกเกม
                </button>
                <button type="button" onClick={() => { onExportStory(); close(); }} className={MENU_ITEM}>
                  <ScrollText size={13} /> ส่งออกเรื่อง
                </button>
                <button type="button" onClick={() => { importInputRef.current?.click(); close(); }} className={MENU_ITEM}>
                  <Upload size={13} /> โหลดเกม
                </button>
                <div className="border-t border-stone-800 mx-2 my-1" />
                {authStatus === "authenticated" ? (
                  <button type="button" onClick={() => { onQuitToDashboard(); close(); }} className={MENU_ITEM}>
                    <LayoutDashboard size={13} /> กลับแดชบอร์ด
                  </button>
                ) : (
                  <button type="button" onClick={() => { onNewGame(); close(); }} className={MENU_ITEM}>
                    <ListRestart size={13} /> เมนูหลัก
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        onChange={onImportSave}
        className="hidden"
      />
    </header>
  );
}
