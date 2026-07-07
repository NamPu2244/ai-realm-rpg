"use client";

import { MessageSquare } from "lucide-react";
import type { ReactNode } from "react";
import type { DialogueLine } from "@/store/useGameStore";

type Segment =
  | { type: "text"; text: string }
  | { type: "dialog"; speaker: string | null; speech: string };

// Render a lightweight inline markdown subset the storyteller emits: **bold** for
// key names/items, *italic* for sound effects / emphasised words. Anything unmatched
// (a lone asterisk, math) passes through as literal text. Newlines are preserved by
// the parent's whitespace-pre-wrap. Bold is matched before italic so "**" never reads
// as two "*". Kept out of the streaming path — partial markers would flicker.
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      nodes.push(<strong key={key++} className="font-semibold text-amber-100">{m[1]}</strong>);
    } else {
      nodes.push(<em key={key++} className="italic text-amber-100/90">{m[2]}</em>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// Search for dialogue text in narrative, trying several common quote wrappers.
// Returns { index, len } of the earliest match, or null if not found.
function findSpeech(
  narrative: string,
  speechText: string,
  fromPos: number,
): { index: number; len: number } | null {
  const candidates = [
    `"${speechText}"`,   // ASCII double quotes
    `“${speechText}”`, // "" curly quotes
    `„${speechText}”`, // „" mixed
    `「${speechText}」`, // 「」 CJK brackets
    speechText,
  ];

  let best: { index: number; len: number } | null = null;
  for (const c of candidates) {
    const idx = narrative.indexOf(c, fromPos);
    if (idx !== -1 && (best === null || idx < best.index)) {
      best = { index: idx, len: c.length };
    }
  }
  return best;
}

// Split narrative text into alternating text/dialog segments using dialogue_lines
// as anchors. Falls back to a single text segment if no matches are found.
function splitByDialogue(narrative: string, dialogueLines: DialogueLine[]): Segment[] {
  if (!dialogueLines.length) return [{ type: "text", text: narrative }];

  const segments: Segment[] = [];
  let cursor = 0;
  let anyMatch = false;

  for (const dl of dialogueLines) {
    const hit = findSpeech(narrative, dl.text, cursor);
    if (hit === null) continue;

    anyMatch = true;
    const before = narrative.slice(cursor, hit.index).trim();
    if (before) segments.push({ type: "text", text: before });
    segments.push({ type: "dialog", speaker: dl.speaker, speech: dl.text });
    cursor = hit.index + hit.len;
  }

  if (!anyMatch) return [{ type: "text", text: narrative }];

  const tail = narrative.slice(cursor).trim();
  if (tail) segments.push({ type: "text", text: tail });

  return segments;
}

interface Props {
  text: string;
  dialogueLines?: DialogueLine[];
  isStreaming?: boolean;
}

export default function NarrativeRenderer({
  text,
  dialogueLines = [],
  isStreaming = false,
}: Readonly<Props>) {
  // During streaming, never split — render raw with cursor
  if (isStreaming) {
    return (
      <p className="text-amber-50/85 leading-[2] text-[0.95rem] whitespace-pre-wrap tracking-wide border-l-2 border-amber-800/40 pl-5">
        {text}
        <span className="inline-block w-0.5 h-[1em] bg-amber-400/80 ml-0.5 align-middle animate-cursor-blink" />
      </p>
    );
  }

  const segments = splitByDialogue(text, dialogueLines);

  // If all segments are plain text (no dialogue matched), render the simple way
  if (segments.length === 1 && segments[0].type === "text") {
    return (
      <p className="text-amber-50/85 leading-[2] text-[0.95rem] whitespace-pre-wrap tracking-wide border-l-2 border-amber-800/40 pl-5">
        {renderInline(text)}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {segments.map((seg) =>
        seg.type === "text" ? (
          <p
            key={seg.text.slice(0, 32)}
            className="text-amber-50/85 leading-[2] text-[0.95rem] whitespace-pre-wrap tracking-wide border-l-2 border-amber-800/40 pl-5"
          >
            {renderInline(seg.text)}
          </p>
        ) : (
          <div
            key={(seg.speaker ?? "") + ":" + seg.speech.slice(0, 32)}
            className="ml-5 border-l-2 border-sky-500/40 pl-4 py-2 bg-sky-950/10 rounded-r-lg"
          >
            {seg.speaker && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <MessageSquare size={11} className="text-sky-400/60 shrink-0" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-sky-400/70">
                  {seg.speaker}
                </span>
              </div>
            )}
            <p className="text-amber-100/82 italic leading-relaxed text-[0.93rem]">
              &#8220;{seg.speech}&#8221;
            </p>
          </div>
        )
      )}
    </div>
  );
}
