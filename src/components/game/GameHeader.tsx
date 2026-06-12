import { RefObject } from "react";
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
      className={`p-4 border-b border-neutral-800 backdrop-blur transition-colors duration-500 ${isLowHp ? "bg-red-950/40" : "bg-neutral-950/80"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-widest">
            AI REALM
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
            Language: {worldConfig?.language} | Tone: {worldConfig?.tone}{" "}
            {isLowHp && (
              <span className="text-red-500 ml-2 font-bold animate-pulse">
                ⚠️ LOW HP WARNING
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenJournal}
            title="เปิดสมุดบันทึกนักเดินทาง"
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50 rounded text-xs whitespace-nowrap transition-colors"
          >
            📖 สมุดบันทึก
          </button>
          <button
            type="button"
            onClick={onExportSave}
            title="บันทึกเกมเป็นไฟล์"
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50 rounded text-xs whitespace-nowrap transition-colors"
          >
            บันทึกเกม
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            title="โหลดเกมจากไฟล์"
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50 rounded text-xs whitespace-nowrap transition-colors"
          >
            โหลดเกม
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
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50 rounded text-xs whitespace-nowrap transition-colors"
            >
              🏠 กลับแดชบอร์ด
            </button>
          ) : (
            <button
              type="button"
              onClick={onNewGame}
              title="กลับไปหน้าสร้างโลกใหม่ (จะมีการถามยืนยัน เพราะความคืบหน้าปัจจุบันจะหายไป)"
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50 rounded text-xs whitespace-nowrap transition-colors"
            >
              เมนูหลัก
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
