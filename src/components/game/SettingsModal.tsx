"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface SettingsModalProps {
  isOpen: boolean;
  groqApiKey: string;
  onSave: (key: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, groqApiKey, onSave, onDelete, onClose }: SettingsModalProps) {
  const [apiKeyDraft, setApiKeyDraft] = useState(groqApiKey);

  // Re-seed the draft from the saved key each time the modal (re)opens, without an
  // effect: React's documented "adjust state while rendering on a change" pattern —
  // track the previous `isOpen` in state and reset on the false→true edge.
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) setApiKeyDraft(groqApiKey);
  }

  if (!isOpen) return null;

  return (
    <Modal onDismiss={onClose} size="lg">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-amber-300 font-semibold text-sm uppercase tracking-widest">คีย์ API ของคุณ</h2>
          {groqApiKey ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> คีย์ส่วนตัว
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/50 border border-amber-800/40 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> คีย์รวม
            </span>
          )}
        </div>

        <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-lg p-4 flex flex-col gap-3 text-xs text-neutral-400 leading-relaxed">
          <div className="flex gap-3">
            <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
            <div>
              <p className="text-neutral-300 font-medium mb-1">คีย์รวม — จำกัด 50 เทิร์น/วัน ต่อ IP</p>
              <p>เราแชร์คีย์ API ให้ทุกคน แต่จำกัดการใช้ 50 เทิร์น/วัน ต่อ IP เพื่อคุมค่าใช้จ่าย โควตารีเซ็ตเที่ยงคืน UTC</p>
            </div>
          </div>
          <div className="border-t border-neutral-700/50" />
          <div className="flex gap-3">
            <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
            <div>
              <p className="text-neutral-300 font-medium mb-1">คีย์ส่วนตัว — เราไม่จำกัดเทิร์น</p>
              <p>ใช้คีย์ Groq ของคุณเองแล้วเราไม่จำกัดจำนวนเทิร์น — ขึ้นกับโควตา Groq ของคุณเท่านั้น (Groq มีแพ็กฟรี) คีย์ของคุณ<span className="text-neutral-200">ถูกส่งไปเซิร์ฟเวอร์เฉพาะตอนเล่นเกม</span> ไม่เคยถูกเก็บบนเซิร์ฟเวอร์เรา และหายไปเมื่อปิดแท็บ</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="groq-key-input" className="text-xs text-neutral-400 font-medium">
ใส่คีย์ Groq API ของคุณ
          </label>
          <input
            id="groq-key-input"
            type="password"
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-700/60 font-mono"
            placeholder="gsk_..."
            value={apiKeyDraft}
            onChange={(e) => setApiKeyDraft(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-neutral-600">
            ขอคีย์ฟรีได้ที่{" "}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:text-amber-400 underline underline-offset-2 transition-colors"
            >
              console.groq.com/keys
            </a>
            {" "}— สมัครฟรี ไม่ต้องใช้บัตรเครดิต
          </p>
        </div>

        <div className="flex gap-2 justify-between items-center">
          {groqApiKey && (
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-2 text-xs text-red-400/70 hover:text-red-300 transition-colors"
            >
              ลบคีย์
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => onSave(apiKeyDraft.trim())}
              className="px-4 py-2 text-xs bg-amber-800/70 hover:bg-amber-700/70 text-amber-200 rounded-lg transition-colors"
            >
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
