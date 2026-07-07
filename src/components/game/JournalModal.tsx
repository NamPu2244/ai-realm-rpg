import { ScrollText, Crosshair, X, CheckCircle2, XCircle, Clock, MapPin } from "lucide-react";
import { Quest, VisitedLocation, WorldConfig } from "@/store/useGameStore";
import { genreLabelTH, toneLabelTH } from "@/lib/gameText";

interface JournalModalProps {
  currentObjective: string;
  storySummary: string;
  worldConfig: WorldConfig | null;
  questLog: Quest[];
  visitedLocations: VisitedLocation[];
  onClose: () => void;
}

const QUEST_STATUS_STYLE: Record<Quest["status"], { icon: typeof CheckCircle2; label: string; cls: string }> = {
  active:    { icon: Clock,         label: "กำลังทำ",   cls: "text-amber-400 border-amber-700/40 bg-amber-950/30" },
  completed: { icon: CheckCircle2,  label: "สำเร็จ",    cls: "text-emerald-400 border-emerald-700/40 bg-emerald-950/20" },
  failed:    { icon: XCircle,       label: "ล้มเหลว",   cls: "text-red-400/70 border-red-800/40 bg-red-950/20" },
};

export default function JournalModal({
  currentObjective,
  storySummary,
  worldConfig,
  questLog,
  visitedLocations,
  onClose,
}: Readonly<JournalModalProps>) {
  const activeQuests = questLog.filter((q) => q.status === "active");
  const doneQuests = questLog.filter((q) => q.status !== "active");

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default animate-modal-backdrop"
        aria-label="ปิดสมุดบันทึก"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-stone-950/95 border border-amber-900/30 rounded-2xl shadow-2xl p-6 space-y-6 animate-modal-pop">
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

        {/* Immediate objective */}
        {currentObjective && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-400/60 uppercase tracking-widest">เป้าหมายปัจจุบัน</h3>
            <p className="flex items-start gap-2 text-sm text-amber-300/90 leading-relaxed">
              <Crosshair size={14} className="mt-0.5 shrink-0" /> {currentObjective}
            </p>
          </div>
        )}

        {/* Quest log */}
        {questLog.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-amber-400/60 uppercase tracking-widest">ภารกิจ</h3>

            {activeQuests.length > 0 && (
              <div className="space-y-2">
                {activeQuests.map((q) => {
                  const s = QUEST_STATUS_STYLE[q.status];
                  const Icon = s.icon;
                  return (
                    <div key={q.id} className={`flex gap-3 px-3 py-2.5 rounded-lg border ${s.cls}`}>
                      <Icon size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold leading-snug">{q.title}</p>
                        {q.description && <p className="text-xs opacity-70 mt-0.5 leading-relaxed">{q.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {doneQuests.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-stone-600 uppercase tracking-widest">สำเร็จ / ล้มเหลว</p>
                {doneQuests.map((q) => {
                  const s = QUEST_STATUS_STYLE[q.status];
                  const Icon = s.icon;
                  return (
                    <div key={q.id} className={`flex gap-2.5 px-3 py-2 rounded-lg border opacity-50 ${s.cls}`}>
                      <Icon size={13} className="shrink-0 mt-0.5" />
                      <p className="text-xs leading-snug line-through">{q.title}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Story summary */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-amber-400/60 uppercase tracking-widest">สรุปเรื่องราว</h3>
          <p className="text-sm text-amber-50/80 leading-relaxed whitespace-pre-wrap">
            {storySummary || "ยังไม่มีเรื่องราวบันทึกไว้..."}
          </p>
        </div>

        {/* Visited locations */}
        {visitedLocations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-400/60 uppercase tracking-widest">สถานที่ที่เคยไป</h3>
            <div className="space-y-1.5">
              {visitedLocations.map((loc, i) => (
                <div key={`${loc.name}-${i}`} className="flex gap-2.5 items-start">
                  <MapPin size={12} className="text-amber-700/60 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-amber-200/70">{loc.name}</span>
                    {loc.description && (
                      <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{loc.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* World info */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-amber-400/60 uppercase tracking-widest">ข้อมูลโลกและตัวละคร</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-amber-400/60">ภาษา: </span>
              <span className="text-amber-50/80">{worldConfig?.language}</span>
            </div>
            <div>
              <span className="text-amber-400/60">โทน: </span>
              <span className="text-amber-50/80">{toneLabelTH(worldConfig?.tone)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-amber-400/60">แนว: </span>
              <span className="text-amber-50/80">{genreLabelTH(worldConfig?.genre)}</span>
            </div>
          </div>
          {worldConfig?.character && (
            <div className="pt-2">
              <span className="text-amber-400/60 text-sm">ตัวละคร: </span>
              <p className="text-sm text-amber-50/80 leading-relaxed mt-1 whitespace-pre-wrap">{worldConfig.character}</p>
            </div>
          )}
          {worldConfig?.customWorld && (
            <div className="pt-2">
              <span className="text-amber-400/60 text-sm">ฉากโลก: </span>
              <p className="text-sm text-amber-50/80 leading-relaxed mt-1 whitespace-pre-wrap">{worldConfig.customWorld}</p>
            </div>
          )}
          {worldConfig?.openingSeed && (
            <div className="pt-2">
              <span className="text-amber-400/60 text-sm">ฉากเปิด: </span>
              <p className="text-sm text-amber-50/80 leading-relaxed mt-1 whitespace-pre-wrap">{worldConfig.openingSeed}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
