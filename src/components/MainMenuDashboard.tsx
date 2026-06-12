"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export default function MainMenuDashboard() {
  const {
    user,
    save_slots,
    is_loading_saves,
    setGameState,
    fetchUserSaves,
    loadSaveSlot,
    deleteSaveSlot,
    signOut,
  } = useGameStore();

  useEffect(() => {
    if (user) fetchUserSaves(user.id);
  }, [user, fetchUserSaves]);

  const handleDelete = (slotId: string, worldName: string) => {
    if (globalThis.confirm(`ต้องการลบโลก "${worldName}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      deleteSaveSlot(slotId);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans">
      <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-widest">AI REALM</h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
            {user?.email}
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50 rounded text-xs whitespace-nowrap transition-colors"
        >
          ออกจากระบบ
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        <button
          type="button"
          onClick={() => setGameState({ game_phase: "Menu" })}
          className="w-full py-4 bg-white text-black font-bold rounded tracking-widest hover:bg-neutral-300 transition-colors"
        >
          ✨ สร้างโลกใหม่
        </button>

        <div className="space-y-3">
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2">
            การเดินทางของคุณ
          </h2>

          {is_loading_saves ? (
            <p className="text-sm text-neutral-500 animate-pulse">กำลังโหลด...</p>
          ) : save_slots.length === 0 ? (
            <p className="text-sm text-neutral-600 italic">
              ยังไม่มีโลกที่บันทึกไว้ กดปุ่ม &quot;สร้างโลกใหม่&quot; เพื่อเริ่มการเดินทาง
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {save_slots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 space-y-3 flex flex-col"
                >
                  <div>
                    <h3 className="font-bold text-white">{slot.world_name || "โลกที่ไม่มีชื่อ"}</h3>
                    {slot.character && (
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{slot.character}</p>
                    )}
                    <p className="text-xs text-neutral-600 mt-2">
                      เล่นล่าสุด: {formatTimestamp(slot.updated_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button
                      type="button"
                      onClick={() => loadSaveSlot(slot.id)}
                      className="flex-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded text-sm font-bold transition-colors"
                    >
                      ▶️ เล่นต่อ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(slot.id, slot.world_name)}
                      title="ลบโลกนี้"
                      className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded text-sm transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
