interface ActionBarProps {
  error: string | null;
  isLoading: boolean;
  isDead: boolean;
  suggestedActions: string[];
  input: string;
  isLowHp: boolean;
  onInputChange: (value: string) => void;
  onSend: (message: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
  onRestart: () => void;
}

export default function ActionBar({
  error,
  isLoading,
  isDead,
  suggestedActions,
  input,
  isLowHp,
  onInputChange,
  onSend,
  onSubmit,
  onRetry,
  onRestart,
}: Readonly<ActionBarProps>) {
  return (
    <div className="p-4 md:p-6 border-t border-neutral-800 bg-neutral-950 flex flex-col gap-3">
      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-950/40 border border-red-800/50 rounded text-sm text-red-300">
          <span>⚠️ {error}</span>
          <button
            onClick={onRetry}
            disabled={isLoading}
            className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 border border-red-700 rounded text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-50"
          >
            {isLoading ? "..." : "ลองอีกครั้ง"}
          </button>
        </div>
      )}
      {isDead ? (
        <button
          onClick={onRestart}
          className="w-full py-4 bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-700 font-bold rounded tracking-widest transition-colors shadow-[0_0_30px_rgba(220,38,38,0.5)]"
        >
          คุณเสียชีวิตแล้ว - จุติใหม่
        </button>
      ) : (
        <>
          {suggestedActions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestedActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => onSend(action)}
                  disabled={isLoading}
                  title="ตัวเลือกที่ AI แนะนำ - คลิกเพื่อทำตามทันที หรือพิมพ์การกระทำของคุณเองในช่องด้านล่าง"
                  className="px-3 py-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 rounded border border-neutral-700/50 text-xs transition-colors disabled:opacity-50"
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            className="flex gap-3 mt-1"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              disabled={isLoading}
              placeholder={
                isLoading
                  ? "GM กำลังประมวลผล..."
                  : "พิมพ์สิ่งที่คุณต้องการทำ..."
              }
              className={`flex-1 bg-neutral-900 border ${isLowHp ? "border-red-900/50 focus:border-red-500" : "border-neutral-700 focus:border-neutral-400"} rounded px-4 py-3 focus:outline-none disabled:opacity-50 transition-colors`}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-neutral-300 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "..." : "ส่ง"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
