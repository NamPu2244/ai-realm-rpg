"use client";

import { X, UserCircle2 } from "lucide-react";
import { CharacterEntry } from "@/store/useGameStore";
import { Modal } from "@/components/ui/Modal";

interface CharacterDossierModalProps {
  characters: Record<string, CharacterEntry>;
  onClose: () => void;
}

function CharacterCard({ entry }: Readonly<{ entry: CharacterEntry }>) {
  return (
    <div className="border border-amber-900/30 rounded-lg bg-stone-900/60 p-4 space-y-2">
      <div className="flex items-start gap-2">
        <UserCircle2 size={18} className="text-amber-500/60 mt-0.5 shrink-0" />
        <h3 className="text-sm font-bold text-amber-200 leading-snug">{entry.name}</h3>
      </div>

      {entry.role && (
        <div className="text-[11px] text-amber-500/70 uppercase tracking-widest font-semibold pl-6">
          {entry.role}
        </div>
      )}

      <p className="text-xs text-stone-300/80 leading-relaxed pl-6">{entry.description}</p>

      <div className="pl-6 space-y-1">
        {entry.relationship && (
          <div className="text-xs text-stone-500">
            <span className="text-stone-600 mr-1">ความสัมพันธ์:</span>
            {entry.relationship}
          </div>
        )}
        {entry.status && (
          <div className="text-xs text-stone-500">
            <span className="text-stone-600 mr-1">สถานะ:</span>
            <span className={entry.status.includes("ตาย") || entry.status.includes("dead") ? "text-red-700" : "text-stone-400"}>
              {entry.status}
            </span>
          </div>
        )}
        {entry.last_seen && (
          <div className="text-xs text-stone-600">
            <span className="mr-1">พบล่าสุด:</span>
            {entry.last_seen}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CharacterDossierModal({ characters, onClose }: Readonly<CharacterDossierModalProps>) {
  const entries = Object.values(characters);

  return (
    <Modal onDismiss={onClose} size="lg" framed>
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-900/20">
          <div>
            <h2 className="text-sm font-bold tracking-widest text-amber-300 uppercase">ทำเนียบตัวละคร</h2>
            <p className="text-[10px] text-stone-600 mt-0.5">พบตัวละคร {entries.length} คน</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
          {entries.length === 0 ? (
            <p className="text-center text-stone-600 text-sm py-8 italic">
              ยังไม่มีตัวละครที่บันทึกไว้
            </p>
          ) : (
            entries.map((entry) => (
              <CharacterCard key={entry.name} entry={entry} />
            ))
          )}
        </div>
    </Modal>
  );
}
