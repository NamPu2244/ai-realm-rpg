// ฟังก์ชันสกัด JSON object ตัวแรกที่สมบูรณ์ออกจากข้อความ โดยนับวงเล็บปีกกา
// แบบเคารพ string literal และ escape character เพื่อไม่ให้ "{"/"}"
// ที่อยู่ในข้อความ narrative ทำให้ตัดขอบเขตผิด
export function extractAndParseJSON(rawAiResponse: string) {
  try {
    const startIndex = rawAiResponse.indexOf("{");
    if (startIndex === -1) throw new Error("No JSON object found.");

    let depth = 0;
    let inString = false;
    let escaped = false;
    let endIndex = -1;

    for (let i = startIndex; i < rawAiResponse.length; i++) {
      const char = rawAiResponse[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (endIndex === -1) throw new Error("No complete JSON object found.");

    const jsonString = rawAiResponse.substring(startIndex, endIndex + 1);
    return { success: true, data: JSON.parse(jsonString) };
  } catch (error) {
    console.error("Parse Error:", error, "Raw AI response:", rawAiResponse);
    return { success: false, rawData: rawAiResponse };
  }
}

// ตัวคั่นระหว่าง prologue (phase 1) กับ narrative (phase 2) ในเทิร์นแรก
// สมองนักเล่าเรื่องจะคาย prologue ก่อน แล้วขึ้นบรรทัดใหม่เป็น marker นี้ ตามด้วย narrative
// ทั้ง route (ฝั่ง server) และ page (ฝั่ง client) ใช้ค่าเดียวกันนี้ในการตัดข้อความ
export const SCENE_DELIM = "[[SCENE]]";

// world_config.genre stores the AI-facing English description and world_config.tone stores
// the raw tone id — never show those raw in the UI. Map them to Thai labels for display.
// A custom (Pro) free-text genre falls through and is shown as typed.
export function genreLabelTH(genre?: string | null): string {
  if (!genre) return "";
  const g = genre.toLowerCase();
  if (g.includes("cyberpunk")) return "ไซเบอร์พังก์";
  if (g.includes("fantasy")) return "แฟนตาซี";
  if (g.includes("science") || g.includes("space") || g.includes("sci-fi") || g.includes("scifi")) return "ไซไฟ";
  if (g.includes("horror")) return "สยองขวัญ";
  if (g.includes("apocalyp")) return "หลังวันสิ้นโลก";
  if (g.includes("wuxia") || g.includes("xianxia") || g.includes("martial") || g.includes("cultivation")) return "กำลังภายใน";
  if (g.includes("modern") || g.includes("urban")) return "ยุคปัจจุบัน";
  return genre;
}

export function toneLabelTH(tone?: string | null): string {
  switch (tone) {
    case "hardcore": return "โหดจริง";
    case "balanced": return "สมดุล";
    case "story": return "เน้นเนื้อเรื่อง";
    case "sandbox": return "อิสระ";
    default: return tone || "";
  }
}

// Marketplace trope tags: the keys stay English (DB + filtering), only the display is Thai.
const TROPE_LABELS_TH: Record<string, string> = {
  "Isekai": "ต่างโลก",
  "System": "ระบบ",
  "Regression": "ย้อนเวลา",
  "Villainess": "นางร้าย",
  "Cultivation": "บำเพ็ญเพียร",
  "OP MC": "พระเอกโอพี",
  "Survival": "เอาชีวิตรอด",
};
export function tropeLabelTH(tag?: string | null): string {
  if (!tag) return "";
  return TROPE_LABELS_TH[tag] ?? tag;
}

// สัญญาณที่ส่งให้ AI เมื่อ QTE หมดเวลา (ห้ามแก้ข้อความนี้ เพราะ system prompt ฝั่ง
// API จับคู่ข้อความนี้แบบ exact เพื่อ narrate ผลของการยืนนิ่งเฉย)
export const QTE_TIMEOUT_SIGNAL = "[TIME OUT: Player failed to react in time and stood completely still]";

// ประเภทของ ambient event — client สุ่มเลือกก่อนส่ง AI ต้องทำตาม type นั้น
// เพื่อป้องกัน AI generate "บรรยากาศรอบข้าง" ซ้ำๆ ตลอด
export const WORLD_EVENT_TYPES = ["NPC", "OVERHEARD", "RUMOR", "DETAIL", "SHIFT", "DISTANT"] as const;
export type WorldEventType = typeof WORLD_EVENT_TYPES[number];

export function buildWorldEventSignal(type: WorldEventType): string {
  return `[WORLD EVENT: ${type}]`;
}

export function isWorldEventSignal(msg: string): boolean {
  return msg.startsWith("[WORLD EVENT");
}

// Legacy constant — ยังใช้ใน import เดิม แต่ตอนนี้ไม่ส่งตรงๆ แล้ว
export const WORLD_EVENT_SIGNAL = "[WORLD EVENT]";

// ข้อความที่แสดงในแชทแทนสัญญาณข้างบน ให้ตรงกับภาษาที่ผู้เล่นเลือก
const QTE_TIMEOUT_DISPLAY: Record<string, string> = {
  "ไทย": "[หมดเวลา] คุณยืนนิ่งเฉย ไม่ทันตอบสนอง...",
  "English": "[Timeout] You freeze up, failing to react in time...",
  "日本語": "[タイムアウト] あなたは反応できず、その場に立ち尽くした...",
};

export function getQteTimeoutDisplay(language?: string): string {
  return QTE_TIMEOUT_DISPLAY[language || ""] || QTE_TIMEOUT_DISPLAY.English;
}

// สัญญาณนับถอยหลังหมดเวลา — system prompt ฝั่ง API จับคู่ prefix "[COUNTDOWN EXPIRED:"
// แบบ exact เพื่อ narrate ผลที่โลกกระทำต่อผู้เล่นที่ยืนนิ่ง
export const COUNTDOWN_EXPIRED_PREFIX = "[COUNTDOWN EXPIRED:";

export function buildCountdownExpiredSignal(label: string): string {
  return `${COUNTDOWN_EXPIRED_PREFIX} ${label}]`;
}

function parseCountdownLabel(signal: string): string {
  const m = /^\[COUNTDOWN EXPIRED:\s*([\s\S]*?)\]\s*$/.exec(signal);
  return m ? m[1].trim() : "";
}

// ข้อความที่แสดงในแชทเมื่อ countdown หมดเวลาโดยผู้เล่นไม่ทำอะไร ({label} = สิ่งที่นับถอยหลัง)
const COUNTDOWN_EXPIRED_DISPLAY: Record<string, (label: string) => string> = {
  "ไทย": (l) => l ? `[หมดเวลา] ${l} — เวลาหมดลงขณะที่คุณยังไม่ทันขยับ...` : "[หมดเวลา] เวลาหมดลงขณะที่คุณยังไม่ทันขยับ...",
  "English": (l) => l ? `[Time's up] ${l} — the clock runs out before you move...` : "[Time's up] The clock runs out before you move...",
  "日本語": (l) => l ? `[タイムアウト] ${l} — 動く間もなく時間が尽きた...` : "[タイムアウト] 動く間もなく時間が尽きた...",
};

export function getCountdownExpiredDisplay(signal: string, language?: string): string {
  const label = parseCountdownLabel(signal);
  const fn = COUNTDOWN_EXPIRED_DISPLAY[language || ""] || COUNTDOWN_EXPIRED_DISPLAY.English;
  return fn(label);
}

// สัญญาณ "ฝั่งโลก/GM" ที่ผู้เล่นไม่ได้เป็นผู้กระทำ (QTE หมดเวลา / countdown หมดเวลา)
// แสดงเป็น system marker ไม่ใช่ player bubble
export function isWorldSideSignal(msg: string): boolean {
  return msg === QTE_TIMEOUT_SIGNAL || msg.startsWith(COUNTDOWN_EXPIRED_PREFIX);
}

// ข้อความ system marker สำหรับสัญญาณฝั่งโลก/GM ตามภาษาที่เลือก
export function getWorldSideDisplay(msg: string, language?: string): string {
  if (msg === QTE_TIMEOUT_SIGNAL) return getQteTimeoutDisplay(language);
  return getCountdownExpiredDisplay(msg, language);
}

// ฟังก์ชันแยกผลทอยเต๋า D20 ออกจากข้อความบรรยาย
const DICE_ROLL_REGEX = /\[\s*(?:ทอยเต๋า\s*)?D20\s*[:：]\s*(\d+)\s*\]\s*-?\s*/i;

export function parseDiceRoll(text: string): { roll: number | null; text: string } {
  const match = DICE_ROLL_REGEX.exec(text);
  if (!match || match.index === undefined) return { roll: null, text };

  const cleaned = (
    text.slice(0, match.index) + text.slice(match.index + match[0].length)
  ).replace(/^\s+/, "");

  return { roll: Number.parseInt(match[1], 10), text: cleaned };
}

const SCENE_IMAGE_STYLE: Record<string, string> = {
  hardcore: ", gritty dark fantasy, brutal realism, harsh lighting, desaturated, grimdark, detailed textures, cinematic",
  balanced: ", dark fantasy RPG concept art, cinematic lighting, dramatic atmosphere, highly detailed, moody, painterly",
  story:    ", storybook illustration, soft warm lighting, painterly, lush colors, atmospheric, highly detailed, epic fantasy art",
  sandbox:  ", vibrant fantasy concept art, colorful, creative, imaginative, high detail, whimsical yet epic, digital painting",
};

function hashPrompt(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

export function buildSceneImageUrl(prompt: string, tone?: string): string {
  // Strip control characters and null bytes; cap length to prevent abuse
  const sanitized = prompt.replace(/[\x00-\x1F\x7F]/g, " ").trim().slice(0, 500);
  const style = SCENE_IMAGE_STYLE[tone ?? ""] ?? SCENE_IMAGE_STYLE.balanced;
  const full = sanitized + style;
  const seed = hashPrompt(full);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=1024&height=420&nologo=true&seed=${seed}&model=flux`;
}

const CHARACTER_PORTRAIT_STYLE: Record<string, string> = {
  hardcore: ", gritty character portrait, battle-worn, dark fantasy, harsh dramatic lighting, detailed face, grimdark",
  balanced: ", dark fantasy character portrait, cinematic lighting, detailed face, painterly, moody",
  story:    ", storybook character portrait, warm soft lighting, painterly, detailed face, fantasy art",
  sandbox:  ", vibrant fantasy character portrait, detailed face, colorful, digital painting, imaginative",
};

export function buildCharacterPortraitUrl(character: string, genre: string, tone?: string): string {
  const style = CHARACTER_PORTRAIT_STYLE[tone ?? ""] ?? CHARACTER_PORTRAIT_STYLE.balanced;
  const subject = character.slice(0, 300);
  const prompt = `character portrait, ${subject}, ${genre} setting${style}`;
  const seed = hashPrompt(prompt);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=300&height=380&nologo=true&seed=${seed}&model=flux`;
}

// Portrait cover art for a marketplace world listing (auto-generated from its
// title + genre). Uses the same Pollinations service as scene/portrait art.
export function buildWorldCoverUrl(title: string, genre: string): string {
  const subject = `${title.slice(0, 160)}, ${genre.slice(0, 80)}`;
  const prompt = `epic key art book cover, ${subject}, dramatic cinematic lighting, painterly, highly detailed, fantasy illustration, no text`;
  const seed = hashPrompt(prompt);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=768&nologo=true&seed=${seed}&model=flux`;
}

export function diceRollStyle(roll: number): string {
  if (roll === 20) return "bg-amber-500/20 border-amber-400 text-amber-300";
  if (roll === 1) return "bg-red-950/50 border-red-600 text-red-400";
  if (roll <= 5) return "bg-red-950/30 border-red-800 text-red-400";
  if (roll >= 15) return "bg-green-950/30 border-green-700 text-green-400";
  return "bg-neutral-800/80 border-neutral-600 text-neutral-300";
}
