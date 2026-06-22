"use client";

interface CountdownBannerProps {
  label: string;
  secondsLeft: number;
  totalSeconds: number;
}

export default function CountdownBanner({ label, secondsLeft, totalSeconds }: Readonly<CountdownBannerProps>) {
  const pct = totalSeconds > 0 ? Math.min(100, (secondsLeft / totalSeconds) * 100) : 0;
  const isCritical = secondsLeft <= 10;
  const isWarning = secondsLeft <= 30 && !isCritical;

  const barColor = isCritical
    ? "bg-red-500"
    : isWarning
    ? "bg-orange-400"
    : "bg-amber-400";

  const textColor = isCritical
    ? "text-red-300"
    : isWarning
    ? "text-orange-300"
    : "text-amber-300";

  const borderColor = isCritical
    ? "border-red-700"
    : isWarning
    ? "border-orange-700"
    : "border-amber-800";

  const bgColor = isCritical
    ? "bg-red-950/95"
    : isWarning
    ? "bg-orange-950/95"
    : "bg-stone-950/95";

  const mins = Math.floor(secondsLeft / 60);
  const secs = Math.floor(secondsLeft % 60);
  const display = mins > 0
    ? `${mins}:${secs.toString().padStart(2, "0")}`
    : `${Math.ceil(secondsLeft)}`;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 border-b ${bgColor} ${borderColor} backdrop-blur-sm pointer-events-none`}
      style={{ animation: isCritical ? "pulse 0.6s ease-in-out infinite" : undefined }}
    >
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3">
        {/* Countdown digit */}
        <span
          className={`font-mono font-black text-2xl tabular-nums leading-none shrink-0 ${textColor} ${isCritical ? "animate-pulse" : ""}`}
          style={{ minWidth: "3.5rem", textAlign: "right" }}
        >
          {display}
        </span>

        {/* Progress bar */}
        <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Label */}
        <span className={`text-xs font-medium shrink-0 max-w-[40%] truncate ${textColor} opacity-80`}>
          {label}
        </span>
      </div>
    </div>
  );
}
