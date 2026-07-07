"use client";

import { Modal } from "@/components/ui/Modal";

interface EnergyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EnergyModal({ isOpen, onClose }: EnergyModalProps) {
  if (!isOpen) return null;

  return (
    <Modal onDismiss={onClose} size="md">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-5xl leading-none">⚡</span>
          <h2 className="text-amber-300 font-bold text-lg tracking-wide mt-1">พลังงานหมด!</h2>
        </div>

        <p className="text-neutral-300 text-sm leading-relaxed text-center">
          เหนื่อยล้าจากการผจญภัยจนแทบขยับไม่ไหว...
          <br />
          พักฟื้นพลังงานพรุ่งนี้ หรือเติมพลังงานตอนนี้เพื่อเล่นต่อทันที
        </p>

        <div className="flex flex-col gap-2.5 mt-1">
          <button
            type="button"
            disabled
            className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-600 to-yellow-500 text-neutral-900 opacity-50 cursor-not-allowed shadow-[0_0_20px_rgba(217,119,6,0.25)]"
          >
            เติมพลังงาน <span className="font-normal opacity-80">(เร็วๆ นี้)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm text-neutral-400 hover:text-neutral-200 border border-neutral-700 hover:border-neutral-500 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </Modal>
  );
}
