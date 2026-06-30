"use client";

import { useState } from "react";
import {
  Sword, Rocket, Bot, Biohazard, Ghost, Building2, Swords,
  Skull, Scale, BookOpen, Palette, ChevronLeft, Lock, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WorldConfig, WorldTone } from "@/store/useGameStore";
import { generateRandomStart } from "@/utils/randomStarts";

const LANGUAGES = ["ไทย", "English", "日本語"];

const GENRES: { id: string; icon: LucideIcon; label: string; value: string }[] = [
  { id: "fantasy",    icon: Sword,     label: "Fantasy",        value: "High fantasy with magic, monsters, and medieval kingdoms" },
  { id: "scifi",      icon: Rocket,    label: "Sci-Fi",         value: "Science fiction with advanced technology, space travel, and aliens" },
  { id: "cyberpunk",  icon: Bot,       label: "Cyberpunk",      value: "Cyberpunk dystopia with megacorporations, hackers, and neon-lit cities" },
  { id: "apocalypse", icon: Biohazard, label: "Post-Apocalypse",value: "Post-apocalyptic wasteland with survivors, mutants, and scarce resources" },
  { id: "horror",     icon: Ghost,     label: "Horror",         value: "Cosmic and psychological horror, full of dread and sanity-testing events" },
  { id: "modern",     icon: Building2, label: "Modern",         value: "Modern-day urban setting with hidden supernatural elements" },
  { id: "wuxia",      icon: Swords,    label: "Wuxia",          value: "Wuxia/Xianxia world of martial arts sects, cultivation, and ancient-China-inspired settings" },
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


const TONES: { id: WorldTone; icon: LucideIcon; label: string; desc: string }[] = [
  { id: "hardcore", icon: Skull,     label: "Hardcore",      desc: "Brutal realism — stupid choices can get you killed, consequences are severe" },
  { id: "balanced", icon: Scale,     label: "Balanced",      desc: "Challenging but fair — chances to recover before hitting a dead end" },
  { id: "story",    icon: BookOpen,  label: "Story-Focused", desc: "Emphasis on narrative and drama — low chance of permadeath" },
  { id: "sandbox",  icon: Palette,   label: "Sandbox",       desc: "Total freedom — AI follows the player's lead with almost no restrictions" },
];

const GENDERS = [
  { id: "unspecified", label: "Unspecified / AI decides" },
  { id: "male",        label: "Male" },
  { id: "female",      label: "Female" },
  { id: "nonbinary",   label: "Non-binary" },
];

const ORIENTATIONS = [
  { id: "unspecified",   label: "Unspecified" },
  { id: "heterosexual",  label: "Heterosexual" },
  { id: "homosexual",    label: "Gay / Lesbian" },
  { id: "bisexual",      label: "Bisexual" },
  { id: "asexual",       label: "Asexual" },
];

const PERSONALITY_TRAITS = [
  "Brave", "Cowardly", "Kind", "Selfish", "Sharp-witted", "Impulsive",
  "Cunning", "Honest", "Cold", "Warm", "Ambitious", "Solitary",
  "Ruthless", "Compassionate", "Curious", "Pessimistic", "Cheerful", "Reserved",
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
        <span className="text-xs font-semibold text-amber-300">Pro Only</span>
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
  const [upsellPlan, setUpsellPlan]           = useState<"monthly" | "yearly">("yearly");
  const [upsellLoading, setUpsellLoading]     = useState(false);
  const [upsellError, setUpsellError]         = useState<string | null>(null);

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
      openingSeed = generateRandomStart();
    }

    onStart({ language: resolvedLanguage, genre: resolvedGenre, tone, character: resolvedCharacter, customWorld: customWorld.trim(), openingSeed, worldName: worldName.trim() });
  };

  const ctaPrice = upsellPlan === "monthly" ? "฿99/mo" : "฿799/yr";

  return (
    <div className="relative h-screen overflow-y-auto bg-neutral-950 text-neutral-200 font-sans">

      {/* ── Upsell modal ── */}
      {showUpsell && (
        <dialog
          open
          aria-label="Pro subscription"
          className="fixed inset-0 z-50 m-0 p-0 w-full h-full max-w-none border-0 bg-transparent"
        >
          {/* Backdrop button — click to dismiss */}
          <button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            className="absolute inset-0 w-full h-full bg-black/70 backdrop-blur-sm cursor-default"
            onClick={() => setShowUpsell(false)}
          />
          {/* Card — floats above backdrop */}
          <div
            className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none"
          >
          <div className="relative pointer-events-auto bg-neutral-900 border border-amber-700/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={18} className="text-amber-400" />
              <h2 className="text-base font-bold text-amber-300">Unlock Pro</h2>
            </div>
            <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
              Build worlds and characters exactly as you imagine — without limits.
            </p>

            {/* Feature list */}
            <ul className="space-y-1.5 text-sm text-neutral-400 mb-5">
              {[
                "Custom Genre — describe any world setting freely",
                "Custom World — add your own rules, systems, and factions",
                "Character Concept — write a detailed backstory",
                "More Save Slots",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5 shrink-0">✦</span>{f}
                </li>
              ))}
            </ul>

            {/* Plan selector */}
            <div className="flex gap-2 mb-4">
              {(["monthly", "yearly"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setUpsellPlan(p)}
                  className={`flex-1 rounded-xl border py-3 text-center transition-all duration-200 ${
                    upsellPlan === p
                      ? "border-amber-600 bg-amber-900/30 text-amber-300"
                      : "border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider">
                    {p === "monthly" ? "Monthly" : "Yearly"}
                  </div>
                  <div className="text-base font-bold mt-0.5">
                    {p === "monthly" ? "฿99" : "฿799"}
                  </div>
                  {p === "yearly" && (
                    <div className="text-[10px] text-emerald-400 mt-0.5">Save 33%</div>
                  )}
                </button>
              ))}
            </div>

            {/* Error */}
            {upsellError && (
              <p className="text-xs text-red-400 mb-3 text-center">{upsellError}</p>
            )}

            {/* CTA */}
            <button
              type="button"
              disabled={upsellLoading}
              onClick={async () => {
                setUpsellError(null);
                setUpsellLoading(true);
                try {
                  const res = await fetch("/api/stripe/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan: upsellPlan }),
                  });
                  const data = await res.json() as { url?: string; error?: string };
                  if (!res.ok || !data.url) throw new Error(data.error ?? "An error occurred");
                  globalThis.location.href = data.url;
                } catch (err) {
                  setUpsellError(err instanceof Error ? err.message : "An error occurred. Please try again");
                  setUpsellLoading(false);
                }
              }}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {upsellLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting...
                </>
              ) : (
                `Subscribe to Pro — ${ctaPrice}`
              )}
            </button>

            <p className="text-[10px] text-neutral-600 text-center mt-2">
              Pay via credit card or PromptPay • Cancel anytime
            </p>

            <button
              type="button"
              onClick={() => setShowUpsell(false)}
              className="mt-2 w-full py-1.5 text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              Close
            </button>
          </div>
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
          <p className="text-sm text-neutral-500">Craft your own world and begin your adventure</p>
          <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-amber-700/50 to-transparent mt-3" />
        </div>

        {/* ── 0. Adventure name ── */}
        <StepCard title="Adventure Name *">
          <input
            type="text"
            value={worldName}
            onChange={(e) => { setWorldName(e.target.value); if (e.target.value.trim()) setWorldNameError(false); }}
            maxLength={60}
            placeholder="e.g. Legend of the Frozen Land, The Last Outpost..."
            className={`${INPUT} ${worldNameError ? "border-red-600/60 focus:border-red-500" : ""}`}
          />
          {worldNameError && (
            <p className="text-xs text-red-400">Please enter an adventure name before starting</p>
          )}
        </StepCard>

        {/* ── 1. Language ── */}
        <StepCard num={1} title="Game Language" tooltip="The language the AI will use for all narration and in-game text">
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
            placeholder="Or type another language..."
            className={INPUT}
          />
        </StepCard>

        {/* ── 2. Genre ── */}
        <StepCard num={2} title="Genre" tooltip="Sets the atmosphere, theme, and setting of the world you will adventure in">
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
              placeholder="Or describe a custom genre freely..."
              rows={2}
              className={TEXTAREA}
            />
          </ProGate>
        </StepCard>

        {/* ── 3. Tone ── */}
        <StepCard num={3} title="Tone / Difficulty" tooltip="Sets how strict the game rules are and how high the risk of death is">
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
        <StepCard num={4} title="Character: Identity & Personality" tooltip="Set your character's gender, orientation, personality, and background — the AI will use this throughout the story">

          {/* Gender */}
          <div className="space-y-2">
            <p title="Used so the AI describes and refers to your character correctly" className="text-xs text-neutral-500 cursor-help">
              Character Gender
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
              placeholder="Or specify another gender..."
              className={INPUT}
            />
          </div>

          {/* Orientation */}
          <div className="space-y-2">
            <p title="Affects relationships and romantic storylines the AI may create during the game" className="text-xs text-neutral-500 cursor-help">
              Sexual Orientation
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
              placeholder="Or specify another orientation..."
              className={INPUT}
            />
          </div>

          {/* Personality traits */}
          <div className="space-y-2">
            <p
              title="These traits define how the AI has your character think, speak, and make decisions"
              className="text-xs text-neutral-500 cursor-help"
            >
              Choose up to 5 personality traits{" "}
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
              placeholder="Describe your character further (optional): race, class, appearance, backstory..."
              rows={2}
              className={TEXTAREA}
            />
          </ProGate>
        </StepCard>

        {/* ── 5. Custom world ── */}
        <StepCard
          num={5}
          title={`Additional World Details${isPro ? "" : " 🔒 Pro"}`}
          tooltip="Add special rules, magic systems, factions, or things you want (or don't want) the AI to include"
        >
          <ProGate locked={!isPro} onLock={() => setShowUpsell(true)}>
            <textarea
              value={customWorld}
              onChange={(e) => setCustomWorld(e.target.value)}
              placeholder="e.g. special world rules, magic system, factions/kingdoms to include, things to avoid..."
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
            ⚔ Begin Adventure
          </span>
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="group flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-neutral-800/50 hover:border-neutral-700/60 text-neutral-500 hover:text-neutral-300 text-sm transition-all duration-250 hover:bg-neutral-900/30"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}
