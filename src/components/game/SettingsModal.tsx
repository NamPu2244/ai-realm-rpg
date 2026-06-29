"use client";

import { useState, useEffect } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  groqApiKey: string;
  onSave: (key: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, groqApiKey, onSave, onDelete, onClose }: SettingsModalProps) {
  const [apiKeyDraft, setApiKeyDraft] = useState(groqApiKey);

  useEffect(() => {
    if (isOpen) setApiKeyDraft(groqApiKey);
  }, [isOpen, groqApiKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-amber-300 font-semibold text-sm uppercase tracking-widest">API Key ของคุณ</h2>
          {groqApiKey ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ใช้ Key ส่วนตัว
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/50 border border-amber-800/40 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> ใช้ Key ส่วนกลาง
            </span>
          )}
        </div>

        <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-lg p-4 flex flex-col gap-3 text-xs text-neutral-400 leading-relaxed">
          <div className="flex gap-3">
            <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
            <div>
              <p className="text-neutral-300 font-medium mb-1">Key ส่วนกลาง — จำกัด 50 เทิร์น/วัน ต่อ IP</p>
              <p>เราแชร์ API Key ของเราให้ทุกคนใช้ร่วมกัน แต่มีโควต้าจำกัด 50 เทิร์น/วันต่อ IP Address เพื่อป้องกันไม่ให้ค่าใช้จ่ายบานปลาย โควต้ารีเซตทุกเที่ยงคืน UTC (07:00 น. ตามเวลาไทย)</p>
            </div>
          </div>
          <div className="border-t border-neutral-700/50" />
          <div className="flex gap-3">
            <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
            <div>
              <p className="text-neutral-300 font-medium mb-1">Key ส่วนตัว — ไม่มีจำกัดจากเรา</p>
              <p>ถ้ามี Groq API Key ของตัวเอง จะไม่มีการจำกัดเทิร์นจากฝั่งเรา ขึ้นอยู่กับโควต้า Groq ของคุณเอง (Groq มีระดับฟรีให้ใช้งาน) Key ของคุณ<span className="text-neutral-200"> ถูกส่งไปยัง Server เฉพาะตอนเล่นเกม</span> — ไม่ถูกบันทึกหรือเก็บไว้ที่เซิร์ฟเวอร์ของเรา และจะหายไปเมื่อปิด Tab</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="groq-key-input" className="text-xs text-neutral-400 font-medium">
            ใส่ Groq API Key ของคุณ
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
            สร้าง Key ฟรีได้ที่{" "}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:text-amber-400 underline underline-offset-2 transition-colors"
            >
              console.groq.com/keys
            </a>
            {" "}— สมัครฟรี ไม่ต้องใส่บัตรเครดิต
          </p>
        </div>

        <div className="flex gap-2 justify-between items-center">
          {groqApiKey && (
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-2 text-xs text-red-400/70 hover:text-red-300 transition-colors"
            >
              ลบ Key ออก
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
    </div>
  );
}
