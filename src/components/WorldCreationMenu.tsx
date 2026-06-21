"use client";

import { useState } from "react";
import {
  Sword, Rocket, Bot, Biohazard, Ghost, Building2, Swords,
  Skull, Scale, BookOpen, Palette, ChevronLeft, Lock, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WorldConfig, WorldTone } from "@/store/useGameStore";

const LANGUAGES = ["ไทย", "English", "日本語"];

const GENRES: { id: string; icon: LucideIcon; label: string; value: string }[] = [
  { id: "fantasy",    icon: Sword,     label: "แฟนตาซี",       value: "High fantasy with magic, monsters, and medieval kingdoms" },
  { id: "scifi",      icon: Rocket,    label: "Sci-Fi",         value: "Science fiction with advanced technology, space travel, and aliens" },
  { id: "cyberpunk",  icon: Bot,       label: "ไซเบอร์พังก์",   value: "Cyberpunk dystopia with megacorporations, hackers, and neon-lit cities" },
  { id: "apocalypse", icon: Biohazard, label: "หลังหายนะ",      value: "Post-apocalyptic wasteland with survivors, mutants, and scarce resources" },
  { id: "horror",     icon: Ghost,     label: "สยองขวัญ",       value: "Cosmic and psychological horror, full of dread and sanity-testing events" },
  { id: "modern",     icon: Building2, label: "โลกปัจจุบัน",    value: "Modern-day urban setting with hidden supernatural elements" },
  { id: "wuxia",      icon: Swords,    label: "กำลังภายใน",     value: "Wuxia/Xianxia world of martial arts sects, cultivation, and ancient-China-inspired settings" },
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

const TONES: { id: WorldTone; icon: LucideIcon; label: string; desc: string }[] = [
  { id: "hardcore", icon: Skull,     label: "Hardcore",      desc: "โลกสมจริงเข้มข้น การกระทำโง่ๆ อาจถึงตาย ผลลัพธ์รุนแรงและจริงจัง" },
  { id: "balanced", icon: Scale,     label: "Balanced",      desc: "ท้าทายแต่ยุติธรรม มีโอกาสแก้ตัวก่อนถึงทางตัน" },
  { id: "story",    icon: BookOpen,  label: "Story-Focused", desc: "เน้นเนื้อเรื่องและดราม่า โอกาสตายต่ำ" },
  { id: "sandbox",  icon: Palette,   label: "Sandbox",       desc: "อิสระสุดๆ AI ตามใจผู้เล่น แทบไม่มีข้อจำกัด" },
];

const GENDERS = [
  { id: "unspecified", label: "ไม่ระบุ / ให้ AI กำหนด" },
  { id: "male",        label: "ชาย" },
  { id: "female",      label: "หญิง" },
  { id: "nonbinary",   label: "นอกบรรทัดฐานทางเพศ" },
];

const ORIENTATIONS = [
  { id: "unspecified",   label: "ไม่ระบุ" },
  { id: "heterosexual",  label: "รักต่างเพศ" },
  { id: "homosexual",    label: "รักเพศเดียวกัน" },
  { id: "bisexual",      label: "รักสองเพศ" },
  { id: "asexual",       label: "ไม่ฝักใฝ่ทางเพศ" },
];

const PERSONALITY_TRAITS = [
  "กล้าหาญ", "ขี้ขลาด", "ใจดี", "เห็นแก่ตัว", "ฉลาดเป็นกรด", "หุนหันพลันแล่น",
  "เจ้าเล่ห์", "ซื่อสัตย์", "เย็นชา", "อบอุ่น", "ทะเยอทะยาน", "สันโดษ",
  "โหดเหี้ยม", "มีเมตตา", "ขี้สงสัย", "มองโลกในแง่ร้าย", "ร่าเริง", "เงียบขรึม",
];

// Deterministic particles — no Math.random() to avoid hydration mismatch
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: (i * 5.9) % 100,
  delay: (i * 1.53) % 11,
  duration: 10 + (i * 1.27) % 10,
  size: 2 + (i * 0.65) % 3,
}));

// ── Shared style tokens ────────────────────────────────────────────────────────
const INPUT = [
  "w-full bg-neutral-950/60 border border-neutral-700/50 rounded-xl px-4 py-2.5 text-sm",
  "text-neutral-200 placeholder:text-neutral-700",
  "focus:outline-none focus:border-amber-600/60 focus:shadow-[0_0_0_3px_rgba(217,119,6,0.1)]",
  "transition-all duration-200",
].join(" ");

const TEXTAREA = INPUT + " resize-none";

const PILL_ON  = "bg-amber-900/40 text-amber-300 border-amber-600/50 font-semibold";
const PILL_OFF = "bg-neutral-900/50 text-neutral-400 border-neutral-700/40 hover:border-neutral-600 hover:text-neutral-300";

// ── Sub-components ─────────────────────────────────────────────────────────────
function StepCard({
  num, title, tooltip, children,
}: Readonly<{ num?: number; title: string; tooltip?: string; children: React.ReactNode }>) {
  return (
    <section className="bg-neutral-900/35 border border-neutral-800/50 rounded-2xl p-5 space-y-4">
      <h2
        title={tooltip}
        className={`flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-widest text-neutral-500 ${tooltip ? "cursor-help" : ""}`}
      >
        {num !== undefined && (
          <span className="w-5 h-5 rounded-full bg-amber-900/40 border border-amber-700/40 flex items-center justify-center text-amber-500 text-[9px] font-bold shrink-0">
            {num}
          </span>
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── Pro gate wrapper ───────────────────────────────────────────────────────────
function ProGate({ locked, onLock, children }: Readonly<{ locked: boolean; onLock: () => void; children: React.ReactNode }>) {
  if (!locked) return <>{children}</>;
  return (
    <div className="relative">
      <div className="pointer-events-none opacity-35 select-none">{children}</div>
      <button
        type="button"
        onClick={onLock}
        className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-amber-950/30 border border-amber-700/30 hover:bg-amber-950/50 transition-colors w-full"
      >
        <Lock size={13} className="text-amber-400" />
        <span className="text-xs font-semibold text-amber-300">Pro เท่านั้น</span>
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface WorldCreationMenuProps {
  onStart: (config: WorldConfig) => void;
  onCancel?: () => void;
  isPro?: boolean;
}

export default function WorldCreationMenu({ onStart, onCancel, isPro = false }: Readonly<WorldCreationMenuProps>) {
  const [language, setLanguage]               = useState(LANGUAGES[0]);
  const [customLanguage, setCustomLanguage]   = useState("");
  const [genreId, setGenreId]                 = useState(GENRES[0].id);
  const [customGenre, setCustomGenre]         = useState("");
  const [tone, setTone]                       = useState<WorldTone>("balanced");
  const [genderId, setGenderId]               = useState("unspecified");
  const [customGender, setCustomGender]       = useState("");
  const [orientationId, setOrientationId]     = useState("unspecified");
  const [customOrientation, setCustomOrientation] = useState("");
  const [traits, setTraits]                   = useState<string[]>([]);
  const [characterConcept, setCharacterConcept] = useState("");
  const [customWorld, setCustomWorld]         = useState("");
  const [worldName, setWorldName]             = useState("");
  const [worldNameError, setWorldNameError]   = useState(false);
  const [showUpsell, setShowUpsell]           = useState(false);

  const toggleTrait = (trait: string) => {
    setTraits((prev) => {
      if (prev.includes(trait)) return prev.filter((t) => t !== trait);
      if (prev.length >= 5) return prev;
      return [...prev, trait];
    });
  };

  const handleStart = () => {
    if (!worldName.trim()) { setWorldNameError(true); return; }
    setWorldNameError(false);
    const resolvedLanguage = customLanguage.trim() || language;
    const resolvedGenre =
      customGenre.trim() || GENRES.find((g) => g.id === genreId)?.value || GENRES[0].value;

    const resolvedGender = customGender.trim() || (genderId === "unspecified" ? "" : GENDERS.find((g) => g.id === genderId)?.label);
    const resolvedOrientation = customOrientation.trim() || (orientationId === "unspecified" ? "" : ORIENTATIONS.find((o) => o.id === orientationId)?.label);
    const genderText      = resolvedGender      ? `Gender: ${resolvedGender}.`           : "";
    const orientationText = resolvedOrientation ? `Sexual orientation: ${resolvedOrientation}.` : "";
    const traitText       = traits.length > 0   ? `Personality traits: ${traits.join(", ")}.`  : "";
    const conceptText     = characterConcept.trim()
      ? `Concept/background: ${characterConcept.trim()}`
      : "Let the GM invent a fitting concept and background for this character based on the personality traits and the chosen genre.";
    const resolvedCharacter = `${genderText} ${orientationText} ${traitText} ${conceptText}`.trim();

    let openingSeed: string;
    if (customWorld.trim()) {
      const seedPool = customGenre.trim() ? OPENING_SEEDS.generic : (OPENING_SEEDS[genreId] || OPENING_SEEDS.generic);
      openingSeed = seedPool[Math.floor(Math.random() * seedPool.length)];
    } else {
      openingSeed = RANDOM_PROLOGUES[Math.floor(Math.random() * RANDOM_PROLOGUES.length)];
    }

    onStart({ language: resolvedLanguage, genre: resolvedGenre, tone, character: resolvedCharacter, customWorld: customWorld.trim(), openingSeed, worldName: worldName.trim() });
  };

  return (
    <div className="relative h-screen overflow-y-auto bg-neutral-950 text-neutral-200 font-sans">

      {/* ── Upsell modal ── */}
      {showUpsell && (
        <dialog
          open
          aria-label="Pro subscription"
          className="fixed inset-0 z-50 m-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 w-full h-full max-w-none border-0"
        >
          <div className="relative bg-neutral-900 border border-amber-700/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-amber-400" />
              <h2 className="text-base font-bold text-amber-300">ปลดล็อก Pro</h2>
            </div>
            <p className="text-sm text-neutral-300 mb-4 leading-relaxed">
              สร้างโลกและตัวละครในแบบที่คุณจินตนาการได้อย่างไร้ขีดจำกัด
            </p>
            <ul className="space-y-2 text-sm text-neutral-400 mb-5">
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">✦</span>Custom Genre — บรรยายแนวโลกได้อย่างอิสระ</li>
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">✦</span>Custom World — ใส่กฎ ระบบ และแฟกชันของโลกเอง</li>
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">✦</span>Character Concept — เขียนที่มาตัวละครได้ละเอียด</li>
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">✦</span>Save Slots เพิ่มขึ้น</li>
            </ul>
            <button
              onClick={() => setShowUpsell(false)}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-sm transition-colors"
            >
              เร็วๆ นี้ — ติดตามความคืบหน้า
            </button>
            <button
              onClick={() => setShowUpsell(false)}
              className="mt-2 w-full py-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              ปิด
            </button>
          </div>
        </dialog>
      )}

      {/* ── Fixed background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-5%,rgba(217,119,6,0.11),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_100%_100%,rgba(120,53,15,0.16),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_45%_at_0%_70%,rgba(15,15,40,0.25),transparent)]" />
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-amber-400/20"
            style={{
              left: `${p.x}%`,
              bottom: -6,
              width: p.size,
              height: p.size,
              animation: `floatParticle ${p.duration}s ${-p.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* ── Scrollable content ── */}
      <div className="relative z-10 max-w-2xl mx-auto px-5 pt-10 pb-20 space-y-4">

        {/* Header */}
        <div className="text-center space-y-2 pb-4">
          <h1 className="text-[1.85rem] font-extrabold tracking-[0.35em] bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400 bg-clip-text text-transparent">
            STORYWEAVE
          </h1>
          <p className="text-sm text-neutral-500">รังสรรค์โลกของคุณเอง แล้วเริ่มการผจญภัย</p>
          <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-amber-700/50 to-transparent mt-3" />
        </div>

        {/* ── 0. Adventure name ── */}
        <StepCard title="ชื่อการผจญภัย *">
          <input
            type="text"
            value={worldName}
            onChange={(e) => { setWorldName(e.target.value); if (e.target.value.trim()) setWorldNameError(false); }}
            maxLength={60}
            placeholder="เช่น ตำนานแห่งดินแดนหิมะ, The Last Outpost..."
            className={`${INPUT} ${worldNameError ? "border-red-600/60 focus:border-red-500" : ""}`}
          />
          {worldNameError && (
            <p className="text-xs text-red-400">กรุณากรอกชื่อการผจญภัยก่อนเริ่มเกม</p>
          )}
        </StepCard>

        {/* ── 1. Language ── */}
        <StepCard num={1} title="ภาษาในการเล่น" tooltip="ภาษาที่ AI จะใช้บรรยายเนื้อเรื่องและข้อความในเกมทั้งหมด">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => { setLanguage(lang); setCustomLanguage(""); }}
                className={`px-4 py-2 rounded-xl border text-sm transition-colors ${
                  language === lang && !customLanguage ? PILL_ON : PILL_OFF
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
            className={INPUT}
          />
        </StepCard>

        {/* ── 2. Genre ── */}
        <StepCard num={2} title="แนวโลก (Genre)" tooltip="กำหนดบรรยากาศ ธีม และเนื้อเรื่องของโลกที่คุณจะผจญภัย">
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {GENRES.map((g) => {
              const active = genreId === g.id && !customGenre;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => { setGenreId(g.id); setCustomGenre(""); }}
                  className={`flex flex-col items-center gap-2 px-2 py-3.5 rounded-xl border text-center transition-all duration-200 ${
                    active ? PILL_ON : PILL_OFF
                  }`}
                >
                  <g.icon size={18} className={active ? "text-amber-400" : "text-neutral-500"} />
                  <span className="text-xs leading-tight">{g.label}</span>
                </button>
              );
            })}
          </div>
          <ProGate locked={!isPro} onLock={() => setShowUpsell(true)}>
            <textarea
              value={customGenre}
              onChange={(e) => setCustomGenre(e.target.value)}
              placeholder="หรือบรรยายแนวโลกแบบ Custom เอง..."
              rows={2}
              className={TEXTAREA}
            />
          </ProGate>
        </StepCard>

        {/* ── 3. Tone ── */}
        <StepCard num={3} title="โทนความยาก / ความเข้มงวด" tooltip="กำหนดความเข้มงวดของกฎเกมและความเสี่ยงต่อการตาย">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TONES.map((t) => {
              const active = tone === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id)}
                  className={`px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                    active ? PILL_ON : PILL_OFF
                  }`}
                >
                  <div className={`flex items-center gap-2 font-bold text-sm ${active ? "text-amber-300" : "text-neutral-300"}`}>
                    <t.icon size={14} className={active ? "text-amber-400" : "text-neutral-500"} />
                    {t.label}
                  </div>
                  <div className={`text-xs mt-1 ${active ? "text-amber-200/60" : "text-neutral-600"}`}>
                    {t.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </StepCard>

        {/* ── 4. Character ── */}
        <StepCard num={4} title="สร้างตัวละคร: จิตใจและลักษณะนิสัย" tooltip="กำหนดเพศ รสนิยม บุคลิก และที่มาของตัวละคร AI จะใช้ข้อมูลนี้ในการเล่าเรื่อง">

          {/* Gender */}
          <div className="space-y-2">
            <p title="ใช้เพื่อให้ AI บรรยายและเรียกตัวละครได้ถูกต้อง" className="text-xs text-neutral-500 cursor-help">
              เพศของตัวละคร
            </p>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => { setGenderId(g.id); setCustomGender(""); }}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    genderId === g.id && !customGender ? PILL_ON : PILL_OFF
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
              className={INPUT}
            />
          </div>

          {/* Orientation */}
          <div className="space-y-2">
            <p title="มีผลต่อความสัมพันธ์และเนื้อเรื่องโรแมนซ์ที่ AI อาจสร้างขึ้นระหว่างเกม" className="text-xs text-neutral-500 cursor-help">
              รสนิยมทางเพศ
            </p>
            <div className="flex flex-wrap gap-2">
              {ORIENTATIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => { setOrientationId(o.id); setCustomOrientation(""); }}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    orientationId === o.id && !customOrientation ? PILL_ON : PILL_OFF
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
              className={INPUT}
            />
          </div>

          {/* Personality traits */}
          <div className="space-y-2">
            <p
              title="บุคลิกเหล่านี้จะกำหนดวิธีที่ AI ให้ตัวละครของคุณคิด พูด และตัดสินใจ"
              className="text-xs text-neutral-500 cursor-help"
            >
              เลือกบุคลิกได้สูงสุด 5 อย่าง{" "}
              <span className={traits.length > 0 ? "text-amber-500" : ""}>{traits.length}/5</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_TRAITS.map((trait) => (
                <button
                  key={trait}
                  type="button"
                  onClick={() => toggleTrait(trait)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    traits.includes(trait) ? PILL_ON : PILL_OFF
                  }`}
                >
                  {trait}
                </button>
              ))}
            </div>
          </div>

          <ProGate locked={!isPro} onLock={() => setShowUpsell(true)}>
            <textarea
              value={characterConcept}
              onChange={(e) => setCharacterConcept(e.target.value)}
              placeholder="อธิบายตัวละครเพิ่มเติม (ไม่บังคับ): เผ่าพันธุ์, อาชีพ, รูปลักษณ์, ที่มา..."
              rows={2}
              className={TEXTAREA}
            />
          </ProGate>
        </StepCard>

        {/* ── 5. Custom world ── */}
        <StepCard
          num={5}
          title={`รายละเอียดโลกเพิ่มเติม${isPro ? "" : " 🔒 Pro"}`}
          tooltip="ใส่กฎพิเศษ ระบบเวทมนตร์ แฟกชัน หรือสิ่งที่อยากให้/ไม่อยากให้เกิดขึ้น เพื่อให้ AI รู้ไว้ล่วงหน้า"
        >
          <ProGate locked={!isPro} onLock={() => setShowUpsell(true)}>
            <textarea
              value={customWorld}
              onChange={(e) => setCustomWorld(e.target.value)}
              placeholder="เช่น กฎพิเศษของโลก, ระบบเวทมนตร์, แฟกชัน/อาณาจักรที่อยากให้มี, สิ่งที่ไม่อยากให้เกิดขึ้น..."
              rows={3}
              className={TEXTAREA}
            />
          </ProGate>
        </StepCard>

        {/* ── Start button ── */}
        <button
          type="button"
          onClick={handleStart}
          className="relative w-full py-4 rounded-2xl font-bold text-sm overflow-hidden group transition-opacity duration-200"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700" />
          <span className="absolute inset-0 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.18)_50%,transparent_65%)] bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite] transition-opacity duration-300" />
          <span className="relative text-neutral-950 font-bold tracking-[0.2em] text-base">
            ⚔ เริ่มการผจญภัย
          </span>
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="group flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-neutral-800/50 hover:border-neutral-700/60 text-neutral-500 hover:text-neutral-300 text-sm transition-all duration-250 hover:bg-neutral-900/30"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            กลับไปแดชบอร์ด
          </button>
        )}
      </div>
    </div>
  );
}
