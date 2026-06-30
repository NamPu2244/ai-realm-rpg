"use client";

interface EnergyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EnergyModal({ isOpen, onClose }: EnergyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-amber-800/50 rounded-2xl shadow-[0_0_60px_rgba(217,119,6,0.15)] p-7 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-5xl leading-none">⚡</span>
          <h2 className="text-amber-300 font-bold text-lg tracking-wide mt-1">Out of Energy!</h2>
        </div>

        <p className="text-neutral-300 text-sm leading-relaxed text-center">
          Exhausted from your adventures, you can barely move...
          <br />
          Rest and recover energy tomorrow, or top up now to continue immediately.
        </p>

        <div className="flex flex-col gap-2.5 mt-1">
          <button
            type="button"
            disabled
            className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-600 to-yellow-500 text-neutral-900 opacity-50 cursor-not-allowed shadow-[0_0_20px_rgba(217,119,6,0.25)]"
          >
            Refill Energy <span className="font-normal opacity-80">(Coming Soon)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm text-neutral-400 hover:text-neutral-200 border border-neutral-700 hover:border-neutral-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
