import { RefObject } from "react";
import { Swords, BookOpen, AlertTriangle, LayoutDashboard, Save, Upload, ListRestart } from "lucide-react";
import { AuthStatus, WorldConfig } from "@/store/useGameStore";

interface GameHeaderProps {
  worldConfig: WorldConfig | null;
  isLowHp: boolean;
  authStatus: AuthStatus;
  importInputRef: RefObject<HTMLInputElement | null>;
  onOpenJournal: () => void;
  onExportSave: () => void;
  onImportSave: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuitToDashboard: () => void;
  onNewGame: () => void;
}

export default function GameHeader({
  worldConfig,
  isLowHp,
  authStatus,
  importInputRef,
  onOpenJournal,
  onExportSave,
  onImportSave,
  onQuitToDashboard,
  onNewGame,
}: Readonly<GameHeaderProps>) {
  return (
    <header
      className={`p-4 border-b backdrop-blur transition-colors duration-500 ${isLowHp ? "bg-red-950/40 border-red-900/40" : "bg-stone-950/70 border-amber-900/20"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-widest bg-gradient-to-r from-amber-200 via-amber-400 to-orange-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(217,119,6,0.25)]">
            <Swords size={20} className="text-amber-400" /> AI REALM
          </h1>
          <p className="text-xs text-amber-100/40 uppercase tracking-wider mt-1">
            Language: {worldConfig?.language} | Tone: {worldConfig?.tone}{" "}
            {isLowHp && (
              <span className="inline-flex items-center gap-1 text-red-400 ml-2 font-bold animate-pulse">
                <AlertTriangle size={11} /> LOW HP WARNING
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenJournal}
            title="เปิดสมุดบันทึกนักเดินทาง"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/60 hover:bg-amber-900/30 text-amber-100/60 hover:text-amber-200 border border-amber-900/30 hover:border-amber-700/50 rounded-lg text-xs whitespace-nowrap transition-all hover:-translate-y-0.5"
          >
            <BookOpen size={13} /> สมุดบันทึก
          </button>
          <button
            type="button"
            onClick={onExportSave}
            title="บันทึกเกมเป็นไฟล์"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/60 hover:bg-amber-900/30 text-amber-100/60 hover:text-amber-200 border border-amber-900/30 hover:border-amber-700/50 rounded-lg text-xs whitespace-nowrap transition-all hover:-translate-y-0.5"
          >
            <Save size={13} /> บันทึกเกม
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            title="โหลดเกมจากไฟล์"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/60 hover:bg-amber-900/30 text-amber-100/60 hover:text-amber-200 border border-amber-900/30 hover:border-amber-700/50 rounded-lg text-xs whitespace-nowrap transition-all hover:-translate-y-0.5"
          >
            <Upload size={13} /> โหลดเกม
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            onChange={onImportSave}
            className="hidden"
          />
          {authStatus === "authenticated" ? (
            <button
              type="button"
              onClick={onQuitToDashboard}
              title="ซิงค์ความคืบหน้าขึ้นคลาวด์แล้วกลับไปหน้าแดชบอร์ด"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/60 hover:bg-amber-900/30 text-amber-100/60 hover:text-amber-200 border border-amber-900/30 hover:border-amber-700/50 rounded-lg text-xs whitespace-nowrap transition-all hover:-translate-y-0.5"
            >
              <LayoutDashboard size={13} /> กลับแดชบอร์ด
            </button>
          ) : (
            <button
              type="button"
              onClick={onNewGame}
              title="กลับไปหน้าสร้างโลกใหม่ (จะมีการถามยืนยัน เพราะความคืบหน้าปัจจุบันจะหายไป)"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/60 hover:bg-amber-900/30 text-amber-100/60 hover:text-amber-200 border border-amber-900/30 hover:border-amber-700/50 rounded-lg text-xs whitespace-nowrap transition-all hover:-translate-y-0.5"
            >
              <ListRestart size={13} /> เมนูหลัก
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
