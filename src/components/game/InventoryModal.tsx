"use client";

import { useEffect } from "react";
import { X, Backpack, Package } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: string[];
  newItems?: Set<string>;
}

export default function InventoryModal({ isOpen, onClose, inventory, newItems }: Readonly<InventoryModalProps>) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    globalThis.addEventListener("keydown", handleKey);
    return () => globalThis.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Modal onDismiss={onClose} size="md" framed>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-900/25 bg-stone-900/50">
            <div className="flex items-center gap-2">
              <Backpack size={14} className="text-amber-500/70" />
              <h2 className="text-xs font-bold tracking-widest uppercase text-amber-400/80">สัมภาระ</h2>
              <span className="text-[10px] tabular-nums text-stone-600 ml-1">{inventory.length} ชิ้น</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-600 hover:text-stone-300 transition-colors p-0.5"
              aria-label="ปิด"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {inventory.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {inventory.map((item, i) => {
                  const isNew = newItems?.has(item);
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border transition-colors duration-500 ${
                        isNew
                          ? "bg-amber-950/40 border-amber-700/50"
                          : "bg-stone-900/50 border-stone-800/60"
                      }`}
                    >
                      <Package
                        size={13}
                        className={`mt-0.5 shrink-0 ${isNew ? "text-amber-400" : "text-stone-600"}`}
                      />
                      <span
                        className={`text-xs leading-snug ${
                          isNew ? "text-amber-300" : "text-stone-400"
                        }`}
                      >
                        {item}
                        {isNew && (
                          <span className="ml-1 text-[9px] font-bold tracking-wider text-amber-500/80">ใหม่</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-stone-700">
                <Backpack size={28} />
                <p className="text-xs italic">กระเป๋าว่างเปล่า</p>
              </div>
            )}
          </div>
    </Modal>
  );
}
