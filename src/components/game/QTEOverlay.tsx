import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface QTEOverlayProps {
  qteTimeLeft: number;
  qteTimeLimit: number;
  qteOptions: string[];
  isLoading: boolean;
  onSelect: (option: string) => void;
}

export default function QTEOverlay({
  qteTimeLeft,
  qteTimeLimit,
  qteOptions,
  isLoading,
  onSelect,
}: Readonly<QTEOverlayProps>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const idx = Number.parseInt(e.key) - 1;
      if (idx >= 0 && idx < qteOptions.length && !isLoading) {
        onSelect(qteOptions[idx]);
      }
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [qteOptions, isLoading, onSelect]);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none border-[6px] border-red-600 animate-pulse shadow-[inset_0_0_80px_rgba(220,38,38,0.6)]">
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-4 px-6 pointer-events-auto">
        <p
          title="Quick Time Event: เลือกตัวเลือกก่อนหมดเวลา ไม่งั้นจะยืนนิ่งและรับผลที่ตามมา"
          className="flex items-center gap-2 text-red-400 font-bold tracking-[0.3em] uppercase text-sm mb-2 animate-pulse cursor-help"
        >
          <AlertTriangle size={16} /> ตอบโต้เดี๋ยวนี้! <AlertTriangle size={16} />
        </p>
        <div className="w-full max-w-md flex items-center gap-2 mb-3">
          <div className="flex-1 bg-neutral-900/80 border border-red-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-red-600 transition-all duration-100 ease-linear"
              style={{
                width: `${qteTimeLimit > 0 ? (qteTimeLeft / qteTimeLimit) * 100 : 0}%`,
              }}
            ></div>
          </div>
          <span className="text-red-400 font-mono font-bold text-sm w-8 text-right tabular-nums">
            {Math.ceil(qteTimeLeft)}s
          </span>
        </div>
        {qteOptions.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-2">
            {qteOptions.map((option, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(option)}
                disabled={isLoading}
                className="px-4 py-2 bg-red-900/80 hover:bg-red-700 active:bg-red-600 text-red-100 border border-red-600 rounded-full font-bold text-sm whitespace-nowrap transition-colors disabled:opacity-50 shadow-lg"
              >
                <span className="text-red-400/70 mr-1.5 text-xs">[{i + 1}]</span>
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
