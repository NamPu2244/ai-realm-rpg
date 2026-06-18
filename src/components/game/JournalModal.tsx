import { ScrollText, Crosshair, X } from "lucide-react";
import { WorldConfig } from "@/store/useGameStore";

interface JournalModalProps {
  currentObjective: string;
  storySummary: string;
  worldConfig: WorldConfig | null;
  onClose: () => void;
}

export default function JournalModal({
  currentObjective,
  storySummary,
  worldConfig,
  onClose,
}: Readonly<JournalModalProps>) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default animate-modal-backdrop"
        aria-label="ปิดสมุดบันทึก"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-stone-950/95 border border-amber-900/30 rounded-2xl shadow-2xl p-6 space-y-6 animate-modal-pop">
        <div className="flex items-center justify-between border-b border-amber-900/20 pb-3">
          <h2 className="flex items-center gap-2 text-lg font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-orange-300 bg-clip-text text-transparent tracking-widest">
            <ScrollText size={18} className="text-amber-400" /> สมุดบันทึกนักเดินทาง
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-amber-100/40 hover:text-amber-200 text-sm px-2 py-1 transition-colors"
          >
            <X size={14} /> ปิด
          </button>
        </div>

        {currentObjective && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-400/60 uppercase tracking-widest">
              เป้าหมายปัจจุบัน
            </h3>
            <p className="flex items-start gap-2 text-sm text-amber-300/90 leading-relaxed">
              <Crosshair size={14} className="mt-0.5 shrink-0" /> {currentObjective}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-amber-400/60 uppercase tracking-widest">
            สรุปเรื่องราวที่ผ่านมา
          </h3>
          <p className="text-sm text-amber-50/80 leading-relaxed whitespace-pre-wrap">
            {storySummary || "ยังไม่มีบันทึกเรื่องราว..."}
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-amber-400/60 uppercase tracking-widest">
            ข้อมูลโลกและตัวละคร
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-amber-400/60">ภาษา: </span>
              <span className="text-amber-50/80">{worldConfig?.language}</span>
            </div>
            <div>
              <span className="text-amber-400/60">โทนเรื่อง: </span>
              <span className="text-amber-50/80">{worldConfig?.tone}</span>
            </div>
            <div className="col-span-2">
              <span className="text-amber-400/60">แนวเรื่อง: </span>
              <span className="text-amber-50/80">{worldConfig?.genre}</span>
            </div>
          </div>
          {worldConfig?.character && (
            <div className="pt-2">
              <span className="text-amber-400/60 text-sm">ตัวละคร: </span>
              <p className="text-sm text-amber-50/80 leading-relaxed mt-1 whitespace-pre-wrap">
                {worldConfig.character}
              </p>
            </div>
          )}
          {worldConfig?.customWorld && (
            <div className="pt-2">
              <span className="text-amber-400/60 text-sm">ฉากหลังโลก: </span>
              <p className="text-sm text-amber-50/80 leading-relaxed mt-1 whitespace-pre-wrap">
                {worldConfig.customWorld}
              </p>
            </div>
          )}
          {worldConfig?.openingSeed && (
            <div className="pt-2">
              <span className="text-amber-400/60 text-sm">จุดเริ่มต้น: </span>
              <p className="text-sm text-amber-50/80 leading-relaxed mt-1 whitespace-pre-wrap">
                {worldConfig.openingSeed}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
