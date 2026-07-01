"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  Library,
  Crown,
  Sparkles,
  Search,
  Star,
  Eye,
  Zap,
  Play,
  X,
  Wand2,
  Upload,
  Coins,
  Loader2,
  Ghost,
} from "lucide-react";

/* ============================================================
   TYPES — mirror public.worlds columns
   ============================================================ */

interface World {
  id: string;
  creator_id: string | null;
  title: string;
  synopsis: string;
  cover_url: string | null;
  cover_type: string | null;
  trope_tags: string[];
  is_premium: boolean;
  price_coins: number;
  rating: number;
  player_count: number;
  created_at: string;
}

type SortKey = "popular" | "newest";

const TROPES = [
  "Isekai",
  "System",
  "Regression",
  "Villainess",
  "Cultivation",
  "OP MC",
  "Survival",
] as const;

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "explore", label: "Explore Worlds", icon: Compass },
  { id: "library", label: "My Library", icon: Library },
  { id: "creators", label: "Top Creators", icon: Crown },
] as const;

// Stable keys for the loading skeleton grid (avoids array-index keys).
const SKELETON_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"];

// Deterministic gradient fallback for worlds that have no cover_url yet.
const COVER_FALLBACKS = [
  "from-rose-600/40 via-fuchsia-700/30 to-indigo-900/60",
  "from-cyan-500/40 via-sky-700/30 to-slate-900/60",
  "from-emerald-500/40 via-teal-700/30 to-slate-900/60",
  "from-amber-500/40 via-orange-700/30 to-slate-900/60",
  "from-violet-500/40 via-purple-800/30 to-slate-900/60",
  "from-blue-500/40 via-indigo-800/30 to-slate-900/60",
];

function fallbackGradient(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return COVER_FALLBACKS[h % COVER_FALLBACKS.length];
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/* ============================================================
   PRICE BADGE
   ============================================================ */

function PriceBadge({ world }: Readonly<{ world: World }>) {
  if (world.price_coins > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-1 text-[11px] font-semibold text-yellow-200 ring-1 ring-yellow-400/30">
        <Coins size={11} /> {world.price_coins}
      </span>
    );
  }
  if (world.is_premium) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400/20 to-fuchsia-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-300/40">
        <Sparkles size={11} /> Premium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
      Free
    </span>
  );
}

/* ============================================================
   SIDEBAR
   ============================================================ */

function Sidebar({
  onPublish,
  onHome,
}: Readonly<{ onPublish: () => void; onHome: () => void }>) {
  const [active, setActive] = useState("explore");
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-white/5 bg-white/[0.02] p-5 backdrop-blur-2xl lg:flex">
      <div className="flex items-center gap-2.5 px-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 shadow-[0_0_20px_rgba(217,70,239,0.5)]">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide text-white">Storyweave</p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">World Store</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => (id === "dashboard" ? onHome() : setActive(id))}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-fuchsia-500/20 to-transparent text-white ring-1 ring-fuchsia-400/30"
                  : "text-white/50 hover:bg-white/5 hover:text-white/90"
              }`}
            >
              <Icon
                size={18}
                className={`transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-fuchsia-300" : ""
                }`}
              />
              <span className="font-medium">{label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_2px_rgba(217,70,239,0.7)]" />
              )}
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onPublish}
        className="group relative mt-2 overflow-hidden rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(217,70,239,0.6)] transition-all duration-300 hover:shadow-[0_10px_30px_-4px_rgba(217,70,239,0.8)] hover:brightness-110"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <Wand2 size={16} />
          Create &amp; Publish World
        </span>
        <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full [mask-image:linear-gradient(90deg,transparent,black,transparent)]" />
      </button>

      <div className="mt-auto rounded-xl border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xs font-bold text-white">
            AR
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">Alex Ryan</p>
            <p className="flex items-center gap-1 text-[11px] text-yellow-300/80">
              <Coins size={11} /> 1,240
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ============================================================
   HERO BANNER — features the top world of the current listing
   ============================================================ */

function HeroBanner({
  world,
  onPlay,
}: Readonly<{ world: World; onPlay: (w: World) => void }>) {
  const gradient = fallbackGradient(world.id);
  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-1 ring-1 ring-white/10`}>
      <div className="relative overflow-hidden rounded-[22px] bg-neutral-950/40 px-8 py-10 backdrop-blur-sm sm:px-12 sm:py-14">
        {world.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={world.cover_url}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-indigo-600/25 blur-3xl" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-fuchsia-200 ring-1 ring-white/15 backdrop-blur">
            <Sparkles size={12} /> Trending #1
          </span>

          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)] sm:text-5xl">
            {world.title}
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70 line-clamp-3 sm:text-base">
            {world.synopsis}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-amber-300">
              <Star size={14} className="fill-amber-300" /> {world.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1 text-white/60">
              <Eye size={14} /> {formatCount(world.player_count)}
            </span>
            {world.trope_tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/70 ring-1 ring-white/10">
                {t}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onPlay(world)}
              className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-neutral-900 shadow-[0_8px_30px_-6px_rgba(255,255,255,0.4)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_10px_34px_-4px_rgba(255,255,255,0.55)]"
            >
              <Play size={16} className="fill-neutral-900 transition-transform group-hover:scale-110" />
              {world.price_coins > 0 || world.is_premium ? "Play Now" : "Play Now (Free)"}
            </button>
            {(world.price_coins > 0 || world.is_premium) && (
              <button
                type="button"
                onClick={() => onPlay(world)}
                className="flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition-all duration-300 hover:bg-white/15"
              >
                <Zap size={16} className="fill-yellow-300 text-yellow-300" />
                Unlock for {world.price_coins || 100}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   TROPE TAGS — controlled by parent so it can drive refetches
   ============================================================ */

function TropeTags({
  selected,
  onSelect,
}: Readonly<{ selected: string | null; onSelect: (t: string | null) => void }>) {
  const pill = (label: string, isSel: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 ${
        isSel
          ? "bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white shadow-[0_0_18px_-2px_rgba(217,70,239,0.7)]"
          : "bg-white/[0.04] text-white/60 ring-1 ring-white/10 hover:bg-white/10 hover:text-white hover:ring-fuchsia-400/40"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {pill("All", selected === null, () => onSelect(null))}
      {TROPES.map((trope) => pill(trope, selected === trope, () => onSelect(trope)))}
    </div>
  );
}

/* ============================================================
   WORLD CARD
   ============================================================ */

function WorldCard({
  world,
  onPlay,
}: Readonly<{ world: World; onPlay: (w: World) => void }>) {
  const gradient = fallbackGradient(world.id);
  return (
    <button
      type="button"
      onClick={() => onPlay(world)}
      className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl bg-white/[0.03] text-left outline-none ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:ring-fuchsia-400/50 hover:shadow-[0_16px_40px_-12px_rgba(217,70,239,0.45)] focus-visible:ring-2 focus-visible:ring-fuchsia-400"
    >
      <div className={`relative aspect-[3/4] overflow-hidden bg-gradient-to-br ${gradient}`}>
        {world.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={world.cover_url}
            alt={world.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/10 to-transparent" />
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

        <div className="absolute left-3 top-3">
          <PriceBadge world={world} />
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
          {world.trope_tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white/80 ring-1 ring-white/10 backdrop-blur"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 shadow-[0_0_30px_rgba(217,70,239,0.6)] backdrop-blur">
            <Play size={22} className="ml-0.5 fill-neutral-900 text-neutral-900" />
          </span>
        </div>
      </div>

      <div className="p-3.5">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-fuchsia-200">
          {world.title}
        </h3>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 font-semibold text-amber-300">
            <Star size={12} className="fill-amber-300" /> {world.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1 text-white/45">
            <Eye size={12} /> {formatCount(world.player_count)}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ============================================================
   PUBLISH MODAL
   ============================================================ */

function PublishModal({ onClose }: Readonly<{ onClose: () => void }>) {
  const [coverMode, setCoverMode] = useState<"ai" | "upload">("ai");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/90 p-7 shadow-2xl backdrop-blur-2xl animate-[popIn_0.28s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl" />

        <div className="relative flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Publish a New World</h2>
            <p className="mt-1 text-sm text-white/50">
              Set your cover art, then send it to the marketplace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative mt-6">
          <label
            htmlFor="publish-world-title"
            className="text-[11px] font-semibold uppercase tracking-widest text-white/40"
          >
            World Title
          </label>
          <input
            id="publish-world-title"
            type="text"
            placeholder="e.g. The Villainess Reverses the Hourglass"
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-fuchsia-400/50 focus:ring-2 focus:ring-fuchsia-500/20"
          />
        </div>

        <div className="relative mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
            Cover Art
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(
              [
                { id: "ai", label: "Generate with AI", sub: "Auto", icon: Wand2 },
                { id: "upload", label: "Upload Custom Art", sub: "PNG / JPG", icon: Upload },
              ] as const
            ).map(({ id, label, sub, icon: Icon }) => {
              const isSel = coverMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCoverMode(id)}
                  className={`group flex flex-col items-center gap-2 rounded-2xl border p-5 text-center transition-all duration-300 ${
                    isSel
                      ? "border-fuchsia-400/60 bg-fuchsia-500/10 shadow-[0_0_24px_-6px_rgba(217,70,239,0.6)]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-xl transition-colors ${
                      isSel
                        ? "bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white"
                        : "bg-white/5 text-white/60 group-hover:text-white"
                    }`}
                  >
                    <Icon size={20} />
                  </span>
                  <span className="text-sm font-semibold text-white">{label}</span>
                  <span className="text-[11px] text-white/40">{sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mt-7 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold text-white/70 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-[2] rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(217,70,239,0.6)] transition hover:brightness-110"
          >
            Publish to Marketplace
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STATES
   ============================================================ */

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
      <div className="aspect-[3/4] animate-pulse bg-white/5" />
      <div className="space-y-2 p-3.5">
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
      </div>
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */

export default function StorePage() {
  const router = useRouter();
  const [showPublish, setShowPublish] = useState(false);

  const [worlds, setWorlds] = useState<World[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [trope, setTrope] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("popular");

  // `reloadKey` lets the Retry button re-trigger the fetch effect without
  // duplicating the request logic outside it.
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch on mount and whenever the trope filter / sort / reload changes.
  // The request lives inside the effect so its `await` boundaries are visible
  // to the compiler — every setState runs post-await, guarded by `cancelled`.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ sort });
        if (trope) params.set("trope", trope);
        const res = await fetch(`/api/store/worlds?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { worlds: World[] };
        if (cancelled) return;
        setWorlds(data.worlds ?? []);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load worlds:", err);
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trope, sort, reloadKey]);

  // Filter/sort/retry handlers own the "loading" transition (setState in an
  // event handler is fine — it never runs synchronously inside the effect).
  const selectTrope = useCallback((t: string | null) => {
    setStatus("loading");
    setTrope(t);
  }, []);
  const selectSort = useCallback((key: SortKey) => {
    setStatus("loading");
    setSort(key);
  }, []);
  const retry = useCallback(() => {
    setStatus("loading");
    setReloadKey((k) => k + 1);
  }, []);

  const openWorld = useCallback(
    (world: World) => {
      router.push(`/play/${world.id}`);
    },
    [router],
  );

  const hero = worlds[0];
  const grid = hero ? worlds.slice(1) : [];

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white">
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97) }
          to { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes floatGlow {
          0%, 100% { opacity: 0.4; transform: translateY(0) }
          50% { opacity: 0.7; transform: translateY(-14px) }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[32rem] w-[32rem] rounded-full bg-fuchsia-600/10 blur-3xl [animation:floatGlow_9s_ease-in-out_infinite]" />
        <div className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-indigo-600/10 blur-3xl [animation:floatGlow_11s_ease-in-out_infinite_1s]" />
      </div>

      <div className="relative flex">
        <Sidebar onPublish={() => setShowPublish(true)} onHome={() => router.push("/")} />

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-neutral-950/60 px-5 py-4 backdrop-blur-xl sm:px-8">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search worlds, tropes, creators…"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition focus:border-fuchsia-400/40 focus:ring-2 focus:ring-fuchsia-500/15"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPublish(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(217,70,239,0.6)] transition hover:brightness-110 lg:hidden"
            >
              <Wand2 size={16} /> Publish
            </button>
            <span className="hidden items-center gap-1.5 rounded-xl bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-yellow-300 ring-1 ring-white/10 sm:flex">
              <Coins size={15} /> 1,240
            </span>
          </header>

          <div className="mx-auto max-w-7xl space-y-10 px-5 py-8 sm:px-8">
            {/* Hero */}
            {status === "ready" && hero && <HeroBanner world={hero} onPlay={openWorld} />}
            {status === "loading" && (
              <div className="h-64 animate-pulse rounded-3xl bg-white/5 ring-1 ring-white/10" />
            )}

            {/* Tropes */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-white">Browse by Trope</h2>
              <TropeTags selected={trope} onSelect={selectTrope} />
            </section>

            {/* Grid */}
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {trope ? `${trope} Worlds` : "Trending Worlds"}
                  </h2>
                  <p className="text-sm text-white/40">Fresh from the community forge</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Sort toggle */}
                  <div className="hidden rounded-lg bg-white/5 p-1 ring-1 ring-white/10 sm:flex">
                    {(["popular", "newest"] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectSort(key)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                          sort === key
                            ? "bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white"
                            : "text-white/50 hover:text-white"
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Loading */}
              {status === "loading" && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {SKELETON_KEYS.map((k) => (
                    <CardSkeleton key={k} />
                  ))}
                </div>
              )}

              {/* Error */}
              {status === "error" && (
                <div className="grid place-items-center rounded-2xl border border-red-500/20 bg-red-500/5 py-16 text-center">
                  <p className="text-sm font-semibold text-red-300">Couldn&apos;t load worlds</p>
                  <button
                    type="button"
                    onClick={retry}
                    className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
                  >
                    <Loader2 size={14} /> Retry
                  </button>
                </div>
              )}

              {/* Empty */}
              {status === "ready" && worlds.length === 0 && (
                <div className="grid place-items-center rounded-2xl border border-white/10 bg-white/[0.02] py-20 text-center">
                  <Ghost size={40} className="text-white/20" />
                  <p className="mt-4 text-sm font-semibold text-white/70">No worlds here yet</p>
                  <p className="mt-1 text-xs text-white/40">
                    {trope ? `Be the first to publish an ${trope} world.` : "Be the first to publish a world."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPublish(true)}
                    className="mt-5 flex items-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    <Wand2 size={14} /> Create a World
                  </button>
                </div>
              )}

              {/* Grid */}
              {status === "ready" && grid.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {grid.map((world) => (
                    <WorldCard key={world.id} world={world} onPlay={openWorld} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {showPublish && <PublishModal onClose={() => setShowPublish(false)} />}
    </div>
  );
}
