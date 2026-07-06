"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (isOpen) setApiKeyDraft(groqApiKey);
  }, [isOpen, groqApiKey]);

  if (!isOpen) return null;

  return (
    <Modal onDismiss={onClose} size="lg">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-amber-300 font-semibold text-sm uppercase tracking-widest">Your API Key</h2>
          {groqApiKey ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Personal Key
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/50 border border-amber-800/40 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Shared Key
            </span>
          )}
        </div>

        <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-lg p-4 flex flex-col gap-3 text-xs text-neutral-400 leading-relaxed">
          <div className="flex gap-3">
            <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
            <div>
              <p className="text-neutral-300 font-medium mb-1">Shared Key — limited to 50 turns/day per IP</p>
              <p>We share our API key with everyone, but limit usage to 50 turns/day per IP address to keep costs manageable. Quota resets at midnight UTC.</p>
            </div>
          </div>
          <div className="border-t border-neutral-700/50" />
          <div className="flex gap-3">
            <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
            <div>
              <p className="text-neutral-300 font-medium mb-1">Personal Key — no limit from us</p>
              <p>With your own Groq API key, there is no turn limit on our side — only your Groq quota applies (Groq offers a free tier). Your key<span className="text-neutral-200"> is sent to the server only during gameplay</span> — it is never stored on our servers and disappears when you close the tab.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="groq-key-input" className="text-xs text-neutral-400 font-medium">
            Enter your Groq API Key
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
            Get a free key at{" "}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:text-amber-400 underline underline-offset-2 transition-colors"
            >
              console.groq.com/keys
            </a>
            {" "}— free sign-up, no credit card required
          </p>
        </div>

        <div className="flex gap-2 justify-between items-center">
          {groqApiKey && (
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-2 text-xs text-red-400/70 hover:text-red-300 transition-colors"
            >
              Remove Key
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(apiKeyDraft.trim())}
              className="px-4 py-2 text-xs bg-amber-800/70 hover:bg-amber-700/70 text-amber-200 rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
