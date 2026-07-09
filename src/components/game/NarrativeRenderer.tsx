"use client";

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

// Stable, distinct accent per speaker so different NPCs read as different "voices"
// (visual-novel style). Anonymous speech falls back to a warm gold.
const SPEAKER_COLORS = ["#5fb4f0", "#b79cff", "#4fd6a0", "#f0a15a", "#ef7a9c", "#57d3d3", "#c9a6ff", "#e6c15a"];
const ANON_COLOR = "#d7b165";
function speakerColor(name: string | null): string {
  if (!name) return ANON_COLOR;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return SPEAKER_COLORS[h % SPEAKER_COLORS.length];
}

// Search for dialogue text in narrative, trying several common quote wrappers.
function findSpeech(narrative: string, speechText: string, fromPos: number): { index: number; len: number } | null {
  const candidates = [`"${speechText}"`, `“${speechText}”`, `„${speechText}”`, `「${speechText}」`, speechText];
  let best: { index: number; len: number } | null = null;
  for (const c of candidates) {
    const idx = narrative.indexOf(c, fromPos);
    if (idx !== -1 && (best === null || idx < best.index)) best = { index: idx, len: c.length };
  }
  return best;
}

// Fallback pass: split a plain-text run on any remaining quoted spans and mark them as
// (speaker-less) dialogue, so speech the extraction model missed still reads as speech.
function splitQuotes(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /[“„"]([^”"“\n]{2,240}?)[”"]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(last, m.index).trim();
    if (before) out.push({ type: "text", text: before });
    out.push({ type: "dialog", speaker: null, speech: m[1].trim() });
    last = re.lastIndex;
  }
  const tail = text.slice(last).trim();
  if (tail) out.push({ type: "text", text: tail });
  return out.length ? out : [{ type: "text", text }];
}

// Split narrative into alternating text / dialogue segments: first anchor the named
// dialogue lines from extraction (keeps the speaker), then sweep the leftover text for
// any other quoted speech.
function splitByDialogue(narrative: string, dialogueLines: DialogueLine[]): Segment[] {
  const anchored: Segment[] = [];
  let cursor = 0;
  for (const dl of dialogueLines) {
    const hit = findSpeech(narrative, dl.text, cursor);
    if (hit === null) continue;
    const before = narrative.slice(cursor, hit.index).trim();
    if (before) anchored.push({ type: "text", text: before });
    anchored.push({ type: "dialog", speaker: dl.speaker, speech: dl.text });
    cursor = hit.index + hit.len;
  }
  const tail = narrative.slice(cursor).trim();
  if (tail) anchored.push({ type: "text", text: tail });
  if (!anchored.length) anchored.push({ type: "text", text: narrative });

  // Sweep leftover text runs for unattributed quotes.
  return anchored.flatMap((seg) => (seg.type === "text" ? splitQuotes(seg.text) : [seg]));
}

const NARRATION_CLASS = "text-amber-50/85 leading-[2] text-[0.95rem] whitespace-pre-wrap tracking-wide border-l-2 border-amber-800/40 pl-5";

function DialogueBlock({ speaker, speech }: Readonly<{ speaker: string | null; speech: string }>) {
  const color = speakerColor(speaker);
  return (
    <div
      className="ahud-vn relative my-1.5 rounded-xl pl-5 pr-4 pt-2.5 pb-3 border-l-[3px] overflow-hidden"
      style={{ borderLeftColor: color, background: `linear-gradient(96deg, ${color}1f, ${color}0a 42%, transparent)` }}
    >
      <span className="pointer-events-none absolute -top-1 left-3 text-5xl leading-none select-none" style={{ color, opacity: 0.18 }} aria-hidden>
        &#8220;
      </span>
      {speaker && (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px]" style={{ color }} aria-hidden>&#9670;</span>
          <span className="text-[10.5px] font-bold tracking-[0.18em] uppercase" style={{ color }}>{speaker}</span>
        </div>
      )}
      <p className="relative text-amber-50/92 leading-relaxed text-[0.98rem] pl-1">
        <span style={{ color }}>&#8220;</span>
        {renderInline(speech)}
        <span style={{ color }}>&#8221;</span>
      </p>
    </div>
  );
}

interface Props {
  text: string;
  dialogueLines?: DialogueLine[];
  isStreaming?: boolean;
}

export default function NarrativeRenderer({ text, dialogueLines = [], isStreaming = false }: Readonly<Props>) {
  // During streaming, never split — render raw with a blinking cursor.
  if (isStreaming) {
    return (
      <p className={NARRATION_CLASS}>
        {text}
        <span className="inline-block w-0.5 h-[1em] bg-amber-400/80 ml-0.5 align-middle animate-cursor-blink" />
      </p>
    );
  }

  const segments = splitByDialogue(text, dialogueLines);

  if (segments.length === 1 && segments[0].type === "text") {
    return <p className={NARRATION_CLASS}>{renderInline(text)}</p>;
  }

  return (
    <div className="space-y-2.5">
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <p key={`t${i}`} className={NARRATION_CLASS}>{renderInline(seg.text)}</p>
        ) : (
          <DialogueBlock key={`d${i}`} speaker={seg.speaker} speech={seg.speech} />
        )
      )}
    </div>
  );
}
