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
  return (
    <div className="fixed inset-0 z-30 pointer-events-none border-[6px] border-red-600 animate-pulse shadow-[inset_0_0_80px_rgba(220,38,38,0.6)]">
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-4 px-6 pointer-events-auto">
        <p
          title="Quick Time Event: เลือกตัวเลือกด้านล่างให้ทันก่อนเวลาหมด ไม่เช่นนั้นจะถือว่าคุณยืนนิ่งเฉยและอาจได้รับผลเสีย"
          className="text-red-400 font-bold tracking-[0.3em] uppercase text-sm mb-2 animate-pulse cursor-help"
        >
          ⚠️ ปฏิกิริยาด่วน! ⚠️
        </p>
        <div className="w-full max-w-md bg-neutral-900/80 border border-red-700 rounded-full h-3 overflow-hidden mb-3">
          <div
            className="h-full bg-red-600 transition-all duration-100 linear"
            style={{
              width: `${qteTimeLimit > 0 ? (qteTimeLeft / qteTimeLimit) * 100 : 0}%`,
            }}
          ></div>
        </div>
        {qteOptions.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-2">
            {qteOptions.map((option, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(option)}
                disabled={isLoading}
                className="px-4 py-2 bg-red-900/80 hover:bg-red-700 text-red-100 border border-red-600 rounded-full font-bold text-sm whitespace-nowrap transition-colors disabled:opacity-50 shadow-lg animate-pulse"
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
