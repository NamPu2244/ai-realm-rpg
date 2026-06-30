"use client";

import { useEffect } from "react";
import { X, Backpack, Package } from "lucide-react";

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

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 transition-all duration-200 ${
          isOpen ? "-translate-y-1/2 opacity-100" : "-translate-y-[45%] opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Inventory"
      >
        <div className="mx-4 bg-stone-950 border border-amber-900/40 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-900/25 bg-stone-900/50">
            <div className="flex items-center gap-2">
              <Backpack size={14} className="text-amber-500/70" />
              <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-amber-400/80">Inventory</h2>
              <span className="text-[10px] tabular-nums text-stone-600 ml-1">{inventory.length} items</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-600 hover:text-stone-300 transition-colors p-0.5"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
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
                          <span className="ml-1 text-[9px] font-bold uppercase tracking-wider text-amber-500/80">new</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-stone-700">
                <Backpack size={28} />
                <p className="text-xs italic">Your pack is empty</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
