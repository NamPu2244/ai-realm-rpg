import type { ReactNode } from "react";
import { Info, AlertTriangle, OctagonX } from "lucide-react";

export type ModalVariant = "info" | "warning" | "danger";

const VARIANT_STYLES: Record<ModalVariant, { icon: ReactNode; accent: string; button: string }> = {
  info: {
    icon: <Info size={18} />,
    accent: "text-blue-300 border-blue-700/50",
    button: "bg-blue-900/80 hover:bg-blue-700 border-blue-600 text-blue-100",
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    accent: "text-amber-300 border-amber-700/50",
    button: "bg-amber-900/80 hover:bg-amber-700 border-amber-600 text-amber-100",
  },
  danger: {
    icon: <OctagonX size={18} />,
    accent: "text-red-300 border-red-700/50",
    button: "bg-red-900/80 hover:bg-red-700 border-red-600 text-red-100",
  },
};

interface ModalProps {
  onDismiss?: () => void;
  children: ReactNode;
  /** "sm" (default) for alerts/confirms; "md"/"lg" for form dialogs. */
  size?: "sm" | "md" | "lg";
  /**
   * Unpadded, height-capped (≤85vh) flex-column panel so the caller can build a
   * fixed header + its own scrollable body (e.g. Inventory / Character registry).
   * Give the scrolling section `flex-1 min-h-0 overflow-y-auto`.
   */
  framed?: boolean;
}

const WIDTH_BY_SIZE: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

const PADDING_BY_SIZE: Record<NonNullable<ModalProps["size"]>, string> = {
  // "sm" keeps the compact alert spacing; "md"/"lg" hand layout to the caller.
  sm: "p-6 space-y-4",
  md: "p-6",
  lg: "p-7",
};

// Backdrop + กล่อง modal กลางจอ พร้อมอนิเมชันเปิด
export function Modal({ onDismiss, children, size = "sm", framed = false }: Readonly<ModalProps>) {
  const panel = framed
    ? `${WIDTH_BY_SIZE[size]} max-h-[85vh] flex flex-col overflow-hidden`
    : `${WIDTH_BY_SIZE[size]} ${PADDING_BY_SIZE[size]}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default animate-modal-backdrop"
        aria-label="ปิด"
        onClick={onDismiss}
        tabIndex={onDismiss ? 0 : -1}
      />
      <div className={`relative w-full ${panel} bg-stone-950/95 border border-amber-900/30 rounded-2xl shadow-2xl animate-modal-pop`}>
        {children}
      </div>
    </div>
  );
}

interface AlertModalProps {
  title?: string;
  message: string;
  variant?: ModalVariant;
  buttonText?: string;
  onClose: () => void;
}

// แจ้งเตือนแบบกดรับทราบอย่างเดียว (ใช้แทน window.alert)
export function AlertModal({
  title,
  message,
  variant = "info",
  buttonText = "ตกลง",
  onClose,
}: Readonly<AlertModalProps>) {
  const styles = VARIANT_STYLES[variant];

  return (
    <Modal onDismiss={onClose}>
      <div className={`flex items-center gap-2 pb-3 border-b ${styles.accent}`}>
        <span className="text-xl">{styles.icon}</span>
        <h2 className="text-sm font-bold tracking-widest uppercase">
          {title || "แจ้งเตือน"}
        </h2>
      </div>
      <p className="text-sm text-amber-50/80 leading-relaxed whitespace-pre-wrap">
        {message}
      </p>
      <button
        type="button"
        onClick={onClose}
        autoFocus
        className={`w-full py-2.5 rounded-xl border font-bold text-sm tracking-wider transition-colors ${styles.button}`}
      >
        {buttonText}
      </button>
    </Modal>
  );
}

interface ConfirmModalProps {
  title?: string;
  message: string;
  variant?: ModalVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// แจ้งเตือนแบบยืนยัน/ยกเลิก (ใช้แทน window.confirm)
export function ConfirmModal({
  title,
  message,
  variant = "warning",
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  onConfirm,
  onCancel,
}: Readonly<ConfirmModalProps>) {
  const styles = VARIANT_STYLES[variant];

  return (
    <Modal onDismiss={onCancel}>
      <div className={`flex items-center gap-2 pb-3 border-b ${styles.accent}`}>
        <span className="text-xl">{styles.icon}</span>
        <h2 className="text-sm font-bold tracking-widest uppercase">
          {title || "ยืนยันการกระทำ"}
        </h2>
      </div>
      <p className="text-sm text-amber-50/80 leading-relaxed whitespace-pre-wrap">
        {message}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-amber-900/30 bg-stone-900/60 hover:bg-stone-800 text-amber-50/70 font-bold text-sm tracking-wider transition-colors"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          autoFocus
          className={`flex-1 py-2.5 rounded-xl border font-bold text-sm tracking-wider transition-colors ${styles.button}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
