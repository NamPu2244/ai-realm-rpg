"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Star, Eye, Play, Coins, Sparkles, Loader2, Ghost, Zap,
} from "lucide-react";
import { useGameStore, WorldConfig, genreToTheme } from "@/store/useGameStore";
import { buildWorldCoverUrl } from "@/lib/gameText";

interface WorldDetail {
  id: string;
  creator_id: string | null;
  title: string;
  synopsis: string;
  cover_url: string | null;
  cover_type: string | null;
  trope_tags: string[];
  world_config: WorldConfig;
  is_premium: boolean;
  price_coins: number;
  rating: number;
  player_count: number;
  created_at: string;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function WorldDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { auth_status, energy, setGameState, createNewSaveSlot } = useGameStore();

  const [world, setWorld] = useState<WorldDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/store/worlds/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { world: WorldDetail };
        if (cancelled) return;
        setWorld(data.world);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load world:", err);
        setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Load this world's config into a fresh game — mirrors handleStartGame in
  // create/page.tsx so a marketplace world plays exactly like a hand-built one.
  const playWorld = useCallback(async () => {
    if (!world?.world_config || launching) return;
    setLaunching(true);
    const config: WorldConfig = {
      ...world.world_config,
      ui_theme: world.world_config.ui_theme ?? genreToTheme(world.world_config.genre),
    };
    setGameState({ world_config: config });
    // Register the play (bumps player_count). Fire-and-forget — the launch must
    // never wait on, or fail because of, the marketplace counter.
    if (id) void fetch(`/api/store/worlds/${id}`, { method: "POST" }).catch(() => {});
    if (auth_status === "authenticated") {
      await createNewSaveSlot(config);
    }
    setGameState({
      game_phase: "Playing",
      history: [],
      lives_left: config.tone === "hardcore" ? 0 : 3,
    });
    router.push("/play");
  }, [world, launching, id, auth_status, setGameState, createNewSaveSlot, router]);

  const cover = world?.cover_url || (world ? buildWorldCoverUrl(world.title, world.world_config?.genre ?? "") : "");

  return (
    <div className="relative min-h-screen bg-[#07050a] text-neutral-200">
      <style>{`
        @keyframes floatGlow { 0%, 100% { opacity: 0.4; transform: translateY(0) } 50% { opacity: 0.7; transform: translateY(-14px) } }
      `}</style>

      {/* Atmospheric background — matches the store listing */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_65%_at_88%_5%,rgba(180,83,9,0.16),transparent_70%)]" />
        <div className="absolute -left-40 top-10 h-[32rem] w-[32rem] rounded-full bg-amber-700/[0.07] blur-3xl [animation:floatGlow_10s_ease-in-out_infinite]" />
        <div className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-orange-800/[0.06] blur-3xl [animation:floatGlow_13s_ease-in-out_infinite_1s]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 py-6 sm:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/store")}
            className="flex items-center gap-2 text-neutral-600 transition-colors hover:text-amber-300"
          >
            <ArrowLeft size={14} />
            <span className="text-xs uppercase tracking-[0.3em]">Back to Store</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-xs font-black tracking-[0.15em] text-white">STORYWEAVE</p>
              <p className="text-[9px] uppercase tracking-[0.3em] text-amber-800/70">World Store</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3.5 py-2 text-sm font-semibold text-amber-300 ring-1 ring-amber-900/25">
              <Zap size={15} className="fill-amber-300" /> {energy}
            </span>
          </div>
        </div>

        {status === "loading" && (
          <div className="grid gap-8 md:grid-cols-[280px_1fr]">
            <div className="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.04]" />
            <div className="space-y-4">
              <div className="h-9 w-3/4 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-4 w-full animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-white/[0.04]" />
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="grid place-items-center rounded-2xl border border-red-500/20 bg-red-500/5 py-20 text-center">
            <Ghost size={40} className="text-red-400/50" />
            <p className="mt-4 text-sm font-semibold text-red-300">World not found</p>
            <button
              type="button"
              onClick={() => router.push("/store")}
              className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-amber-900/25 transition hover:bg-white/15"
            >
              Back to Store
            </button>
          </div>
        )}

        {status === "ready" && world && (
          <div className="grid gap-8 md:grid-cols-[280px_1fr]">
            {/* Cover */}
            <div className="relative overflow-hidden rounded-2xl ring-1 ring-amber-900/30">
              <div className="aspect-[3/4] bg-gradient-to-br from-amber-800/40 to-[#07050a]">
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt={world.title} className="h-full w-full object-cover" />
                )}
              </div>
            </div>

            {/* Details */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {world.is_premium && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-300/40">
                    <Sparkles size={11} /> Premium
                  </span>
                )}
                {world.price_coins > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-400/30">
                    <Coins size={11} /> {world.price_coins}
                  </span>
                )}
                {!world.is_premium && world.price_coins === 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                    Free
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                {world.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-amber-300">
                  <Star size={14} className="fill-amber-300" /> {world.rating.toFixed(1)}
                </span>
                <span className="flex items-center gap-1 text-neutral-500">
                  <Eye size={14} /> {formatCount(world.player_count)} players
                </span>
                {world.world_config?.genre && (
                  <span className="text-neutral-500">{world.world_config.genre}</span>
                )}
              </div>

              {world.trope_tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {world.trope_tags.map((t) => (
                    <span key={t} className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-neutral-300 ring-1 ring-amber-900/30">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-5 text-sm leading-relaxed text-neutral-300">{world.synopsis}</p>

              {world.world_config?.character && (
                <div className="mt-5 rounded-xl border border-amber-900/25 bg-white/[0.02] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-800/80">You Play As</p>
                  <p className="mt-1.5 text-sm text-neutral-300">{world.world_config.character}</p>
                </div>
              )}

              <button
                type="button"
                onClick={playWorld}
                disabled={launching}
                className="group mt-7 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-7 py-3.5 text-sm font-bold text-white shadow-[0_8px_30px_-6px_rgba(217,119,6,0.55)] transition-all duration-300 hover:scale-[1.02] hover:brightness-110 disabled:opacity-60"
              >
                {launching ? <Loader2 size={17} className="animate-spin" /> : <Play size={17} className="fill-white transition-transform group-hover:scale-110" />}
                {launching ? "Weaving your story…" : "Play This World"}
              </button>

              {auth_status !== "authenticated" && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-600">
                  <Zap size={12} className="text-amber-700" />
                  Playing as a guest — sign in to save your progress to the cloud.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
