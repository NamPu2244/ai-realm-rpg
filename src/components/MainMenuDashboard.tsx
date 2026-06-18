"use client";

import { useEffect, useState } from "react";
import { Plus, Play, Trash2, LogOut, Clock, Swords, Skull } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { ConfirmModal } from "@/components/ui/Modal";

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: (i * 7.3) % 100,
  delay: (i * 1.9) % 10,
  duration: 10 + (i * 1.4) % 11,
  size: 2 + (i * 0.6) % 3,
}));

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

export default function MainMenuDashboard() {
  const {
    user, save_slots, is_loading_saves,
    setGameState, fetchUserSaves, loadSaveSlot, deleteSaveSlot, signOut,
  } = useGameStore();

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (user) fetchUserSaves(user.id);
  }, [user, fetchUserSaves]);

  const handleDelete = (slotId: string, worldName: string) => {
    setConfirmDelete({ id: slotId, name: worldName });
  };

  return (
    <div className="relative h-screen overflow-y-auto bg-neutral-950 text-neutral-200 font-sans">

      {/* ── Fixed background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-5%,rgba(217,119,6,0.11),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_100%_100%,rgba(120,53,15,0.16),transparent)]" />
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-amber-400/20"
            style={{
              left: `${p.x}%`,
              bottom: -6,
              width: p.size,
              height: p.size,
              animation: `floatParticle ${p.duration}s ${-p.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-neutral-950/80 border-b border-amber-900/20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-[0.3em] bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400 bg-clip-text text-transparent leading-none">
              AI REALM
            </h1>
            {user?.email && (
              <p className="text-xs text-neutral-600 mt-0.5 truncate max-w-[220px]">{user.email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="group flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-800/60 hover:border-neutral-700/60 text-neutral-500 hover:text-neutral-300 text-xs transition-all duration-200 hover:bg-neutral-900/40 shrink-0"
          >
            <LogOut size={13} className="group-hover:text-neutral-400 transition-colors" />
            ออกจากระบบ
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Primary CTA */}
        {save_slots.length >= 10 ? (
          <div className="w-full py-4 rounded-2xl text-center text-sm text-neutral-500 border border-neutral-800/50 bg-neutral-900/30">
            ถึงขีดจำกัด 10 โลกแล้ว — ลบโลกเก่าก่อนเพื่อสร้างใหม่
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setGameState({ game_phase: "Menu" })}
            className="relative w-full py-4 rounded-2xl font-bold overflow-hidden group transition-opacity duration-200"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700" />
            <span className="absolute inset-0 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.18)_50%,transparent_65%)] bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite] transition-opacity duration-300" />
            <span className="relative text-neutral-950 font-bold tracking-[0.2em] text-base flex items-center justify-center gap-2">
              <Plus size={18} /> สร้างโลกใหม่
            </span>
          </button>
        )}

        {/* Save slots */}
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-neutral-500 pb-1">
            <Swords size={11} className="text-amber-700/50" />
            การเดินทางของคุณ
          </h2>

          {is_loading_saves && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-neutral-900/35 border border-neutral-800/50 rounded-2xl h-32 animate-pulse" />
              ))}
            </div>
          )}
          {!is_loading_saves && save_slots.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Swords size={40} className="text-neutral-800" />
              <p className="text-neutral-600 text-sm">ยังไม่มีโลกที่บันทึกไว้</p>
              <p className="text-neutral-700 text-xs">กดปุ่ม &quot;สร้างโลกใหม่&quot; เพื่อเริ่มการเดินทาง</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {save_slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`group relative border rounded-2xl p-5 space-y-3 flex flex-col transition-all duration-300 ${slot.is_dead ? "bg-neutral-950/60 border-red-950/50 hover:border-red-900/50" : "bg-neutral-900/35 border-neutral-800/50 hover:border-amber-900/35"}`}
                >
                  {/* Left accent bar */}
                  <div className={`absolute left-0 top-5 bottom-5 w-0.5 rounded-full bg-gradient-to-b from-transparent to-transparent ${slot.is_dead ? "via-red-900/40" : "via-amber-700/30"}`} />

                  {/* Death banner */}
                  {slot.is_dead && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-red-950/70 border border-red-900/50 rounded-full">
                      <Skull size={10} className="text-red-700" />
                      <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest">
                        {slot.tone === "hardcore" ? "Permadeath" : "ตายแล้ว"}
                      </span>
                    </div>
                  )}

                  <div className="pl-3">
                    <h3 className={`font-bold leading-tight ${slot.is_dead ? "text-neutral-500" : "text-white"}`}>
                      {slot.world_name || "โลกที่ไม่มีชื่อ"}
                    </h3>
                    {slot.character && (
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                        {slot.character}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-neutral-700">
                      <Clock size={10} />
                      เล่นล่าสุด: {formatTimestamp(slot.updated_at)}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto pl-3">
                    {/* Play / View history button */}
                    <button
                      type="button"
                      onClick={() => loadSaveSlot(slot.id)}
                      className="relative flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl overflow-hidden group/play"
                    >
                      {slot.is_dead ? (
                        <>
                          <span className="absolute inset-0 bg-neutral-900/50 border border-neutral-800/50 rounded-xl" />
                          <span className="absolute inset-0 bg-neutral-800/50 border border-neutral-700/50 rounded-xl opacity-0 group-hover/play:opacity-100 transition-opacity duration-200" />
                          <Skull size={12} className="relative text-neutral-600" />
                          <span className="relative text-sm font-bold text-neutral-500">ดูบันทึก</span>
                        </>
                      ) : (
                        <>
                          <span className="absolute inset-0 bg-amber-900/30 border border-amber-800/40 rounded-xl" />
                          <span className="absolute inset-0 bg-amber-900/50 border border-amber-700/50 rounded-xl opacity-0 group-hover/play:opacity-100 transition-opacity duration-200" />
                          <Play size={12} className="relative text-amber-400" />
                          <span className="relative text-sm font-bold text-amber-300">เล่นต่อ</span>
                        </>
                      )}
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(slot.id, slot.world_name)}
                      title="ลบโลกนี้"
                      className="flex items-center justify-center px-3 py-2.5 bg-red-950/25 hover:bg-red-900/45 text-red-500/70 hover:text-red-400 border border-red-900/30 hover:border-red-800/50 rounded-xl transition-all duration-200"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {confirmDelete && (
        <ConfirmModal
          variant="danger"
          title="ลบโลกนี้?"
          message={`ต้องการลบโลก "${confirmDelete.name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
          confirmText="ลบ"
          cancelText="ยกเลิก"
          onConfirm={() => { deleteSaveSlot(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
