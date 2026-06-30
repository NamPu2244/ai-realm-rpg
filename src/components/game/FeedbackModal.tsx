"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setFeedbackText("");
    setFeedbackSent(false);
    onClose();
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim() || feedbackSubmitting) return;
    setFeedbackSubmitting(true);
    try {
      const saveSlotId = useGameStore.getState().current_save_slot_id;
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackText.trim(), saveSlotId }),
      });
      setFeedbackSent(true);
      setFeedbackText("");
      setTimeout(() => { setFeedbackSent(false); onClose(); }, 2000);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6 flex flex-col gap-4">
        <h2 className="text-amber-300 font-semibold text-sm uppercase tracking-widest">Send Feedback</h2>
        {feedbackSent ? (
          <p className="text-emerald-400 text-sm text-center py-4">Thank you for your feedback!</p>
        ) : (
          <>
            <textarea
              className="w-full bg-neutral-800 border border-neutral-600 rounded-lg p-3 text-sm text-neutral-200 placeholder-neutral-500 resize-none focus:outline-none focus:border-amber-700/60"
              rows={5}
              placeholder="Report a bug, suggest an idea, or share what you love..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              maxLength={2000}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitFeedback}
                disabled={feedbackSubmitting || feedbackText.trim().length < 5}
                className="px-4 py-2 text-xs bg-amber-800/70 hover:bg-amber-700/70 disabled:opacity-40 text-amber-200 rounded-lg transition-colors"
              >
                {feedbackSubmitting ? "Sending..." : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
