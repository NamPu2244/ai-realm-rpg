"use client";

import { useState } from "react";
import { AiProvider, WorldConfig, WorldTone } from "@/store/useGameStore";

const LANGUAGES = ["ไทย", "English", "日本語"];

const GENRES = [
  { id: "fantasy", label: "🗡️ แฟนตาซี", value: "High fantasy with magic, monsters, and medieval kingdoms" },
  { id: "scifi", label: "🚀 Sci-Fi", value: "Science fiction with advanced technology, space travel, and aliens" },
  { id: "cyberpunk", label: "🤖 ไซเบอร์พังก์", value: "Cyberpunk dystopia with megacorporations, hackers, and neon-lit cities" },
  { id: "apocalypse", label: "☣️ หลังหายนะ", value: "Post-apocalyptic wasteland with survivors, mutants, and scarce resources" },
  { id: "horror", label: "👻 สยองขวัญ", value: "Cosmic and psychological horror, full of dread and sanity-testing events" },
  { id: "modern", label: "🏙️ โลกปัจจุบัน", value: "Modern-day urban setting with hidden supernatural elements" },
  { id: "wuxia", label: "⚔️ กำลังภายใน", value: "Wuxia/Xianxia world of martial arts sects, cultivation, and ancient-China-inspired settings" },
];

const OPENING_SEEDS: Record<string, string[]> = {
  fantasy: [
    "Bandits ambush the caravan you are traveling with on a forest road.",
    "You wake up in a castle dungeon cell, accused of a crime you don't remember committing.",
    "You arrive at a market town just as a public execution is about to begin.",
    "You are deep inside an ancient ruin when the only entrance collapses behind you.",
    "A merchant's wagon breaks down near a cursed forest at dusk, and something is watching from the trees.",
  ],
  scifi: [
    "You wake from cryosleep aboard a derelict ship with no crew in sight.",
    "Alarms blare through the space station moments after you arrive.",
    "Your shuttle crash-lands on an uncharted planet.",
    "A routine memory-wipe procedure goes wrong halfway through.",
    "You are recruited for a black-ops mission aboard a corporate freighter.",
  ],
  cyberpunk: [
    "You wake up in a back-alley clinic after a botched cybernetic implant surgery, with someone pounding on the door.",
    "While working a late courier shift, you intercept a data package everyone seems to want.",
    "A corporate fixer offers you a job in a crowded neon-lit bar.",
    "Corporate security is chasing you through rain-soaked streets.",
    "You wake up with no memory in a capsule hotel, your account drained to zero.",
  ],
  apocalypse: [
    "You emerge from a fallout shelter for the first time in years.",
    "Your settlement is attacked by raiders at dawn.",
    "You're scavenging an abandoned supermarket when you hear footsteps.",
    "You wake up separated from your group after a sandstorm.",
    "A wounded stranger collapses at your camp's gate, bringing news of a nearby threat.",
  ],
  horror: [
    "You receive a phone call from a number that hasn't existed in years.",
    "You wake up in an abandoned hospital with no memory of how you got there.",
    "Your car breaks down near an isolated village that feels wrong.",
    "While house-sitting alone, you start hearing noises from a locked room.",
    "An old letter leads you to your family's abandoned estate.",
  ],
  modern: [
    "You witness something impossible on your way home from work.",
    "You inherit a strange apartment from a relative you never knew.",
    "A stranger hands you a mysterious item and tells you to run.",
    "You wake up with abilities you didn't have yesterday.",
    "Your phone receives a message from your own number, sent tomorrow.",
  ],
  wuxia: [
    "You are fleeing your destroyed sect, the only survivor of a betrayal.",
    "You arrive at a martial arts tournament in a remote mountain town.",
    "An old hermit offers to teach you a forbidden technique - for a price.",
    "You witness a duel between two masters while traveling the jianghu.",
    "A wounded stranger collapses at your feet, clutching a mysterious manual.",
  ],
  generic: [
    "Your story begins in the middle of an unexpected crisis.",
    "You arrive somewhere new, carrying only what you can hold.",
    "Someone important to your story is about to make contact with you.",
    "You wake up with a fragment of memory missing, but a clear goal in mind.",
    "An opportunity - or a trap - presents itself right at the start.",
  ],
};

// ใช้แทน custom world/character เมื่อผู้เล่นไม่กรอกอะไรเลย เพื่อหลีกเลี่ยงโครงเรื่องซ้ำๆ
// (ตื่นในถ้ำ/โรงเตี๊ยม/ความจำเสื่อม/เสียงประหลาด) แล้วเปิดเรื่องแบบหนัง In Media Res แทน
const RANDOM_PROLOGUES: string[] = [
  "ลืมตาขึ้นมาพบว่าตัวเองกำลังดิ่งพสุธาจากท้องฟ้า โดยที่ร่มชูชีพมีรอยฉีกขาด",
  "คุณนั่งอยู่ในงานเลี้ยงหรูหรา แต่จู่ๆ ทุกคนในห้องก็หยุดนิ่งและหันมาจ้องคุณด้วยสายตาอาฆาต",
  "รอดชีวิตจากเหตุการณ์ยานอวกาศตกบนดาวเคราะห์น้ำแข็ง และออกซิเจนชุดสูทเหลือเพียง 10 นาที",
  "ตื่นขึ้นมากลางพิธีบูชายัญ โดยที่คุณไม่ใช่คนทำพิธี แต่เป็นเครื่องสังเวยที่ถูกมัดอยู่",
  "คุณกำลังขับรถหนีด้วยความเร็วสูงบนทางด่วน ขณะที่เฮลิคอปเตอร์ติดไฟฉายส่องตามหลังและเสียงไซเรนถี่ขึ้นทุกที",
  "สายไฟเบอร์ออปติกในร่างกายของคุณกะพริบเตือนสีแดง เคาท์ดาวน์การฆ่าตัวเองของชิปฝังสมองเหลืออีกไม่กี่นาที กลางตรอกย่านเมืองไซเบอร์พังก์ที่ฝนกรดตกไม่หยุด",
  "เรือที่คุณโดยสารมาอับปางกลางพายุ คุณเกาะแผ่นไม้ลอยมาติดเกาะร้างที่เต็มไปด้วยซากปรักหักพังประหลาด ขณะที่คลื่นยักษ์กำลังก่อตัวซัดเข้าฝั่งอีกครั้ง",
  "ระหว่างพิธีราชาภิเษกของคุณเอง มีคนลอบสังหารกษัตริย์องค์ก่อนต่อหน้าทุกคน และทุกสายตาในท้องพระโรงกำลังจับจ้องมาที่คุณในฐานะผู้ต้องสงสัยอันดับหนึ่ง",
];

export const AI_MODELS: { id: string; label: string; desc: string; provider: AiProvider }[] = [
  {
    id: "qwen2.5:14b",
    label: "Qwen2.5 14B (Local)",
    desc: "แนะนำ — ทำตามกฎหลายชั้นได้ดีกว่า (D20, ป้องกันการโกง) ภาษาไทยลื่นไหลกว่า แต่ใช้ทรัพยากรเครื่องมากขึ้นและตอบช้าลง",
    provider: "ollama",
  },
  {
    id: "gemma4:e2b",
    label: "Gemma 4 e2b (Local)",
    desc: "โมเดลขนาดเล็ก ตอบเร็วและเบาเครื่อง เหมาะกับเครื่องสเปกไม่สูง แต่บางครั้งอาจทำตามกฎที่ซับซ้อน (เช่น การป้องกันการโกง) ได้ไม่แม่นยำนัก",
    provider: "ollama",
  },
];

export const CLOUD_AI_MODELS: { id: string; label: string; desc: string; provider: AiProvider }[] = [
  {
    id: "llama-3.3-70b-versatile",
    label: "☁️ Llama 3.3 70B (Groq Cloud)",
    desc: "แนะนำ — โมเดลขนาดใหญ่บนคลาวด์ผ่าน Groq ตามกฎซับซ้อนได้ดีและตอบทันที (ไม่มีช่วงคิดเงียบแบบโมเดล reasoning) เหมาะกับระบบ QTE ที่ต้องการความเร็ว ไม่กินทรัพยากรเครื่อง ต้องตั้งค่า GROQ_API_KEY บนเซิร์ฟเวอร์",
    provider: "groq",
  },
  {
    id: "qwen/qwen3-32b",
    label: "☁️ Qwen3 32B (Groq Cloud)",
    desc: "รันบนคลาวด์ผ่าน Groq — เป็นโมเดล reasoning ที่ต้อง \"คิด\" แบบไม่แสดงผลก่อนตอบ ซึ่งอาจใช้เวลานานหลายสิบวินาทีก่อนข้อความแรกจะปรากฏ (ไม่เหมาะกับ QTE) ต้องตั้งค่า GROQ_API_KEY บนเซิร์ฟเวอร์",
    provider: "groq",
  },
  {
    id: "qwen3.5:397b-cloud",
    label: "☁️ Qwen3.5 397B (Ollama Cloud)",
    desc: "โมเดลขนาดใหญ่มากรันบนคลาวด์ผ่าน Ollama — ตามกฎซับซ้อนได้ดีและไม่กินทรัพยากรเครื่อง ต้อง `ollama signin` บนเซิร์ฟเวอร์ก่อนใช้งาน เป็นโมเดล reasoning จึงอาจมีช่วงคิดก่อนตอบ",
    provider: "ollama",
  },
  {
    id: "gemini-2.5-flash",
    label: "☁️ Gemini 2.5 Flash (Google AI)",
    desc: "แนะนำ — โมเดลขนาดใหญ่บนคลาวด์ผ่าน Google AI ตามกฎซับซ้อนได้ดีและตอบทันที ไม่กินทรัพยากรเครื่อง ต้องตั้งค่า GEMINI_API_KEY บนเซิร์ฟเวอร์",
    provider: "gemini",
  },
];

export const ALL_AI_MODELS = [...AI_MODELS, ...CLOUD_AI_MODELS];

const TONES: { id: WorldTone; label: string; desc: string }[] = [
  { id: "hardcore", label: "💀 Hardcore", desc: "โลกสมจริงเข้มข้น การกระทำโง่ๆ อาจถึงตาย ผลลัพธ์รุนแรงและจริงจัง" },
  { id: "balanced", label: "⚖️ Balanced", desc: "ท้าทายแต่ยุติธรรม มีโอกาสแก้ตัวก่อนถึงทางตัน" },
  { id: "story", label: "📖 Story-Focused", desc: "เน้นเนื้อเรื่องและดราม่า โอกาสตายต่ำ" },
  { id: "sandbox", label: "🎨 Sandbox", desc: "อิสระสุดๆ AI ตามใจผู้เล่น แทบไม่มีข้อจำกัด" },
];

const GENDERS = [
  { id: "unspecified", label: "ไม่ระบุ / ให้ AI กำหนด" },
  { id: "male", label: "ชาย" },
  { id: "female", label: "หญิง" },
  { id: "nonbinary", label: "นอกบรรทัดฐานทางเพศ" },
];

const ORIENTATIONS = [
  { id: "unspecified", label: "ไม่ระบุ" },
  { id: "heterosexual", label: "รักต่างเพศ" },
  { id: "homosexual", label: "รักเพศเดียวกัน" },
  { id: "bisexual", label: "รักสองเพศ" },
  { id: "asexual", label: "ไม่ฝักใฝ่ทางเพศ" },
];

const PERSONALITY_TRAITS = [
  "กล้าหาญ", "ขี้ขลาด", "ใจดี", "เห็นแก่ตัว", "ฉลาดเป็นกรด", "หุนหันพลันแล่น",
  "เจ้าเล่ห์", "ซื่อสัตย์", "เย็นชา", "อบอุ่น", "ทะเยอทะยาน", "สันโดษ",
  "โหดเหี้ยม", "มีเมตตา", "ขี้สงสัย", "มองโลกในแง่ร้าย", "ร่าเริง", "เงียบขรึม",
];

interface WorldCreationMenuProps {
  onStart: (config: WorldConfig) => void;
  onCancel?: () => void;
}

export default function WorldCreationMenu({ onStart, onCancel }: Readonly<WorldCreationMenuProps>) {
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [customLanguage, setCustomLanguage] = useState("");
  const [genreId, setGenreId] = useState(GENRES[0].id);
  const [customGenre, setCustomGenre] = useState("");
  const [tone, setTone] = useState<WorldTone>("balanced");
  const [genderId, setGenderId] = useState("unspecified");
  const [customGender, setCustomGender] = useState("");
  const [orientationId, setOrientationId] = useState("unspecified");
  const [customOrientation, setCustomOrientation] = useState("");
  const [traits, setTraits] = useState<string[]>([]);
  const [characterConcept, setCharacterConcept] = useState("");
  const [customWorld, setCustomWorld] = useState("");
  const [aiModel, setAiModel] = useState(AI_MODELS[0].id);
  const [customModel, setCustomModel] = useState("");

  const toggleTrait = (trait: string) => {
    setTraits((prev) => {
      if (prev.includes(trait)) return prev.filter((t) => t !== trait);
      if (prev.length >= 5) return prev;
      return [...prev, trait];
    });
  };

  const handleStart = () => {
    const resolvedLanguage = customLanguage.trim() || language;
    const resolvedGenre =
      customGenre.trim() || GENRES.find((g) => g.id === genreId)?.value || GENRES[0].value;

    const resolvedGender = customGender.trim() || (genderId === "unspecified" ? "" : GENDERS.find((g) => g.id === genderId)?.label);
    const resolvedOrientation = customOrientation.trim() || (orientationId === "unspecified" ? "" : ORIENTATIONS.find((o) => o.id === orientationId)?.label);
    const genderText = resolvedGender ? `Gender: ${resolvedGender}.` : "";
    const orientationText = resolvedOrientation ? `Sexual orientation: ${resolvedOrientation}.` : "";

    const traitText = traits.length > 0 ? `Personality traits: ${traits.join(", ")}.` : "";
    const conceptText = characterConcept.trim()
      ? `Concept/background: ${characterConcept.trim()}`
      : "Let the GM invent a fitting concept and background for this character based on the personality traits and the chosen genre.";
    const resolvedCharacter = `${genderText} ${orientationText} ${traitText} ${conceptText}`.trim();

    // ถ้าผู้เล่นไม่กรอกรายละเอียดโลกเอง สุ่ม "Cinematic Prologue" ภาษาไทยมาแทน
    // เพื่อเลี่ยงโครงเรื่องซ้ำๆ (ตื่นในถ้ำ/โรงเตี๊ยม/ความจำเสื่อม) จาก seed ทั่วไป
    let openingSeed: string;
    if (customWorld.trim()) {
      const seedPool = customGenre.trim() ? OPENING_SEEDS.generic : (OPENING_SEEDS[genreId] || OPENING_SEEDS.generic);
      openingSeed = seedPool[Math.floor(Math.random() * seedPool.length)];
    } else {
      openingSeed = RANDOM_PROLOGUES[Math.floor(Math.random() * RANDOM_PROLOGUES.length)];
    }

    const resolvedModel = customModel.trim() || aiModel;
    const resolvedProvider: AiProvider = customModel.trim()
      ? "ollama"
      : ALL_AI_MODELS.find((m) => m.id === aiModel)?.provider || "ollama";

    onStart({
      language: resolvedLanguage,
      genre: resolvedGenre,
      tone,
      character: resolvedCharacter,
      customWorld: customWorld.trim(),
      openingSeed,
      aiModel: resolvedModel,
      aiProvider: resolvedProvider,
    });
  };

  return (
    <div className="h-screen overflow-y-auto bg-neutral-950 text-neutral-200">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-widest">AI REALM</h1>
          <p className="text-sm text-neutral-500">รังสรรค์โลกของคุณเอง แล้วเริ่มการผจญภัย</p>
        </div>

        {/* Language */}
        <section className="space-y-3">
          <h2
            title="ภาษาที่ AI จะใช้บรรยายเนื้อเรื่องและข้อความในเกมทั้งหมด"
            className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 cursor-help"
          >
            1. ภาษาในการเล่น
          </h2>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  setLanguage(lang);
                  setCustomLanguage("");
                }}
                className={`px-4 py-2 rounded border text-sm transition-colors ${
                  language === lang && !customLanguage
                    ? "bg-white text-black border-white font-bold"
                    : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={customLanguage}
            onChange={(e) => setCustomLanguage(e.target.value)}
            placeholder="หรือพิมพ์ภาษาอื่น..."
            className="w-full bg-neutral-900 border border-neutral-700 focus:border-neutral-400 rounded px-4 py-2 text-sm focus:outline-none transition-colors"
          />
        </section>

        {/* Genre */}
        <section className="space-y-3">
          <h2
            title="กำหนดบรรยากาศ ธีม และเนื้อเรื่องของโลกที่คุณจะผจญภัย"
            className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 cursor-help"
          >
            2. แนวโลก (Genre)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GENRES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setGenreId(g.id);
                  setCustomGenre("");
                }}
                className={`px-3 py-2 rounded border text-sm text-left transition-colors ${
                  genreId === g.id && !customGenre
                    ? "bg-white text-black border-white font-bold"
                    : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <textarea
            value={customGenre}
            onChange={(e) => setCustomGenre(e.target.value)}
            placeholder="หรือบรรยายแนวโลกแบบ Custom เอง..."
            rows={2}
            className="w-full bg-neutral-900 border border-neutral-700 focus:border-neutral-400 rounded px-4 py-2 text-sm focus:outline-none transition-colors resize-none"
          />
        </section>

        {/* Tone */}
        <section className="space-y-3">
          <h2
            title="กำหนดความเข้มงวดของกฎเกมและความเสี่ยงต่อการตาย ตั้งแต่สมจริงสุดๆ ไปจนถึงอิสระไม่มีข้อจำกัด"
            className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 cursor-help"
          >
            3. โทนความยาก / ความเข้มงวด
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id)}
                className={`px-4 py-3 rounded border text-left transition-colors ${
                  tone === t.id
                    ? "bg-white text-black border-white"
                    : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500"
                }`}
              >
                <div className="font-bold text-sm">{t.label}</div>
                <div className={`text-xs mt-1 ${tone === t.id ? "text-neutral-700" : "text-neutral-500"}`}>
                  {t.desc}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Character */}
        <section className="space-y-3">
          <h2
            title="กำหนดเพศ รสนิยม บุคลิก และที่มาของตัวละครที่คุณจะสวมบทบาท AI จะใช้ข้อมูลนี้ในการเล่าเรื่อง"
            className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 cursor-help"
          >
            4. สร้างตัวละคร: จิตใจและลักษณะนิสัย
          </h2>

          {/* Gender */}
          <div className="space-y-2">
            <p title="ใช้เพื่อให้ AI บรรยายและเรียกตัวละครได้ถูกต้อง" className="text-xs text-neutral-500 cursor-help">เพศของตัวละคร</p>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGenderId(g.id);
                    setCustomGender("");
                  }}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    genderId === g.id && !customGender
                      ? "bg-white text-black border-white font-bold"
                      : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customGender}
              onChange={(e) => setCustomGender(e.target.value)}
              placeholder="หรือระบุเพศแบบอื่นเอง..."
              className="w-full bg-neutral-900 border border-neutral-700 focus:border-neutral-400 rounded px-4 py-2 text-sm focus:outline-none transition-colors"
            />
          </div>

          {/* Sexual orientation */}
          <div className="space-y-2">
            <p title="มีผลต่อความสัมพันธ์และเนื้อเรื่องโรแมนซ์ที่ AI อาจสร้างขึ้นระหว่างเกม" className="text-xs text-neutral-500 cursor-help">รสนิยมทางเพศ</p>
            <div className="flex flex-wrap gap-2">
              {ORIENTATIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setOrientationId(o.id);
                    setCustomOrientation("");
                  }}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    orientationId === o.id && !customOrientation
                      ? "bg-white text-black border-white font-bold"
                      : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customOrientation}
              onChange={(e) => setCustomOrientation(e.target.value)}
              placeholder="หรือระบุรสนิยมทางเพศแบบอื่นเอง..."
              className="w-full bg-neutral-900 border border-neutral-700 focus:border-neutral-400 rounded px-4 py-2 text-sm focus:outline-none transition-colors"
            />
          </div>

          <p title="บุคลิกเหล่านี้จะกำหนดวิธีที่ AI ให้ตัวละครของคุณคิด พูด และตัดสินใจในสถานการณ์ต่างๆ" className="text-xs text-neutral-500 cursor-help">เลือกบุคลิกได้สูงสุด 5 อย่าง (เลือกแล้ว {traits.length}/5)</p>
          <div className="flex flex-wrap gap-2">
            {PERSONALITY_TRAITS.map((trait) => (
              <button
                key={trait}
                type="button"
                onClick={() => toggleTrait(trait)}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  traits.includes(trait)
                    ? "bg-white text-black border-white font-bold"
                    : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500"
                }`}
              >
                {trait}
              </button>
            ))}
          </div>
          <textarea
            value={characterConcept}
            onChange={(e) => setCharacterConcept(e.target.value)}
            placeholder="อธิบายตัวละครเพิ่มเติม (ไม่บังคับ): เผ่าพันธุ์, อาชีพ, รูปลักษณ์, ที่มา..."
            rows={2}
            className="w-full bg-neutral-900 border border-neutral-700 focus:border-neutral-400 rounded px-4 py-2 text-sm focus:outline-none transition-colors resize-none"
          />
        </section>

        {/* Custom world details */}
        <section className="space-y-3">
          <h2
            title="ใส่กฎพิเศษ ระบบเวทมนตร์ แฟกชัน หรือสิ่งที่อยากให้/ไม่อยากให้เกิดขึ้น เพื่อให้ AI รู้ไว้ล่วงหน้า"
            className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 cursor-help"
          >
            5. รายละเอียดโลกเพิ่มเติม (ไม่บังคับ)
          </h2>
          <textarea
            value={customWorld}
            onChange={(e) => setCustomWorld(e.target.value)}
            placeholder="เช่น กฎพิเศษของโลก, ระบบเวทมนตร์, แฟกชัน/อาณาจักรที่อยากให้มี, สิ่งที่ไม่อยากให้เกิดขึ้น..."
            rows={3}
            className="w-full bg-neutral-900 border border-neutral-700 focus:border-neutral-400 rounded px-4 py-2 text-sm focus:outline-none transition-colors resize-none"
          />
        </section>

        {/* AI Model */}
        <section className="space-y-3">
          <h2
            title="โมเดล AI ที่จะทำหน้าที่เป็น Game Master เล่าเรื่อง ตัดสินผลการกระทำ และอัปเดตสถานะตัวละคร"
            className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 cursor-help"
          >
            6. โมเดล AI
          </h2>

          <p title="รันบนเครื่องของคุณเองผ่าน Ollama ไม่ต้องใช้อินเทอร์เน็ตหรือ API Key" className="text-xs text-neutral-500 uppercase tracking-widest cursor-help">รันในเครื่อง (Ollama)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AI_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setAiModel(m.id);
                  setCustomModel("");
                }}
                className={`px-4 py-3 rounded border text-left transition-colors ${
                  aiModel === m.id && !customModel
                    ? "bg-white text-black border-white"
                    : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500"
                }`}
              >
                <div className="font-bold text-sm">{m.label}</div>
                <div className={`text-xs mt-1 ${aiModel === m.id && !customModel ? "text-neutral-700" : "text-neutral-500"}`}>
                  {m.desc}
                </div>
              </button>
            ))}
          </div>
          <input
            type="text"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="หรือพิมพ์ชื่อโมเดล Ollama อื่นที่ติดตั้งไว้ (เช่น llama3.1:8b)..."
            className="w-full bg-neutral-900 border border-neutral-700 focus:border-neutral-400 rounded px-4 py-2 text-sm focus:outline-none transition-colors"
          />

          <p title="รันบนเซิร์ฟเวอร์คลาวด์ผ่าน Groq หรือ Ollama Cloud ตอบเร็วและไม่กินทรัพยากรเครื่อง แต่ต้องตั้งค่า API Key / เข้าสู่ระบบบนเซิร์ฟเวอร์ล่วงหน้า" className="text-xs text-neutral-500 uppercase tracking-widest pt-2 cursor-help">รันบนคลาวด์ (Groq / Ollama Cloud)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CLOUD_AI_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setAiModel(m.id);
                  setCustomModel("");
                }}
                className={`px-4 py-3 rounded border text-left transition-colors ${
                  aiModel === m.id && !customModel
                    ? "bg-white text-black border-white"
                    : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500"
                }`}
              >
                <div className="font-bold text-sm">{m.label}</div>
                <div className={`text-xs mt-1 ${aiModel === m.id && !customModel ? "text-neutral-700" : "text-neutral-500"}`}>
                  {m.desc}
                </div>
              </button>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={handleStart}
          className="w-full py-4 bg-white text-black font-bold rounded tracking-widest hover:bg-neutral-300 transition-colors"
        >
          เริ่มการผจญภัย
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50 rounded text-sm tracking-widest transition-colors"
          >
            ← กลับไปแดชบอร์ด
          </button>
        )}
      </div>
    </div>
  );
}
