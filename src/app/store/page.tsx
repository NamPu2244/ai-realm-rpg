"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Compass, Library, Search, Star, Users, Play, X, Wand2,
  Loader2, Ghost, ArrowLeft, Sparkles, Zap, Lock, Trash2,
} from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { getSupabaseClient } from "@/lib/supabase/client";
import { buildWorldCoverUrl } from "@/lib/gameText";
import { ConfirmModal, Modal } from "@/components/ui/Modal";

/* ============================================================
   TYPES — mirror public.worlds columns (world_config omitted here)
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
type Tab = "explore" | "library";

const TROPES = [
  "Isekai", "System", "Regression", "Villainess", "Cultivation", "OP MC", "Survival",
] as const;

const SKELETON_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"];

// Deterministic amber-toned gradient fallback for worlds with no cover_url.
const COVER_FALLBACKS = [
  "from-amber-700/40 via-orange-950/40 to-[#07050a]",
  "from-yellow-700/35 via-amber-950/45 to-[#07050a]",
  "from-orange-700/40 via-red-950/35 to-[#07050a]",
  "from-amber-600/35 via-yellow-950/40 to-[#07050a]",
  "from-stone-600/40 via-amber-950/50 to-[#07050a]",
  "from-rose-900/35 via-amber-950/40 to-[#07050a]",
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
  if (world.is_premium) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-300/40">
        <Sparkles size={11} /> พรีเมียม
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
      ฟรี
    </span>
  );
}

/* ============================================================
   HERO BANNER — features the top world of the current listing
   ============================================================ */

function HeroBanner({ world, onOpen }: Readonly<{ world: World; onOpen: (w: World) => void }>) {
  const gradient = fallbackGradient(world.id);
  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-px ring-1 ring-amber-900/40`}>
      <div className="relative overflow-hidden rounded-[23px] bg-[#0b0806]/70 px-8 py-10 backdrop-blur-sm sm:px-12 sm:py-14">
        {world.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={world.cover_url} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" />
        )}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-orange-700/15 blur-3xl" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-200 ring-1 ring-amber-400/25 backdrop-blur">
            <Sparkles size={12} /> มาแรงอันดับ 1
          </span>

          <h1 className="mt-5 font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] text-4xl sm:text-5xl">
            {world.title}
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-300 line-clamp-3 sm:text-base">
            {world.synopsis}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-amber-300">
              <Star size={14} className="fill-amber-300" /> {world.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1 text-neutral-500">
              <Users size={14} /> {formatCount(world.player_count)}
            </span>
            {world.trope_tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-neutral-300 ring-1 ring-amber-900/30">
                {t}
              </span>
            ))}
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => onOpen(world)}
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-[0_8px_30px_-6px_rgba(217,119,6,0.5)] transition-all duration-300 hover:scale-[1.03] hover:brightness-110"
            >
              <Play size={16} className="fill-white transition-transform group-hover:scale-110" />
              เข้าเล่นโลก
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   TROPE TAGS
   ============================================================ */

function TropeTags({ selected, onSelect }: Readonly<{ selected: string | null; onSelect: (t: string | null) => void }>) {
  const pill = (label: string, isSel: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
        isSel
          ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_18px_-4px_rgba(217,119,6,0.7)]"
          : "bg-white/[0.03] text-neutral-400 ring-1 ring-amber-900/25 hover:bg-white/[0.06] hover:text-amber-100 hover:ring-amber-600/40"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {pill("ทั้งหมด", selected === null, () => onSelect(null))}
      {TROPES.map((trope) => pill(trope, selected === trope, () => onSelect(trope)))}
    </div>
  );
}

/* ============================================================
   WORLD CARD
   ============================================================ */

function WorldCard({ world, onOpen, onDelete }: Readonly<{ world: World; onOpen: (w: World) => void; onDelete?: (w: World) => void }>) {
  const gradient = fallbackGradient(world.id);
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onOpen(world)}
        className="block w-full cursor-pointer overflow-hidden rounded-2xl bg-white/[0.02] text-left outline-none ring-1 ring-amber-900/20 transition-all duration-300 hover:-translate-y-1 hover:ring-amber-600/50 hover:shadow-[0_16px_40px_-14px_rgba(217,119,6,0.4)] focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <div className={`relative aspect-[3/4] overflow-hidden bg-gradient-to-br ${gradient}`}>
          {world.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={world.cover_url} alt={world.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#07050a] via-[#07050a]/10 to-transparent" />

          <div className="absolute left-3 top-3">
            <PriceBadge world={world} />
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
            {world.trope_tags.slice(0, 2).map((t) => (
              <span key={t} className="rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-medium text-neutral-200 ring-1 ring-amber-900/30 backdrop-blur">
                {t}
              </span>
            ))}
          </div>

          <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-amber-500/90 shadow-[0_0_30px_rgba(217,119,6,0.6)] backdrop-blur">
              <Play size={22} className="ml-0.5 fill-white text-white" />
            </span>
          </div>
        </div>

        <div className="p-3.5">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-neutral-100 transition-colors group-hover:text-amber-200">
            {world.title}
          </h3>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-semibold text-amber-300">
              <Star size={12} className="fill-amber-300" /> {world.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1 text-neutral-500">
              <Users size={12} /> {formatCount(world.player_count)}
            </span>
          </div>
        </div>
      </button>

      {onDelete && (
        <button
          type="button"
          aria-label="ลบโลก"
          title="ลบโลกนี้"
          onClick={() => onDelete(world)}
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg bg-black/50 text-red-300/80 opacity-0 ring-1 ring-red-500/20 backdrop-blur transition-all duration-200 hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

/* ============================================================
   PUBLISH MODAL — publishes an existing save slot to the marketplace
   ============================================================ */

function PublishModal({ onClose, onPublished }: Readonly<{ onClose: () => void; onPublished: () => void }>) {
  const { user, save_slots } = useGameStore();

  const [slotId, setSlotId] = useState<string>(save_slots[0]?.id ?? "");
  const [title, setTitle] = useState<string>(save_slots[0]?.world_name ?? "");
  const [synopsis, setSynopsis] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSlot = save_slots.find((s) => s.id === slotId);

  const toggleTag = (t: string) =>
    setTags((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      return prev.length < 6 ? [...prev, t] : prev;
    });

  const chooseSlot = (id: string) => {
    setSlotId(id);
    const slot = save_slots.find((s) => s.id === id);
    if (slot && !title.trim()) setTitle(slot.world_name);
  };

  const handlePublish = async () => {
    setError(null);
    if (!title.trim()) return setError("กรุณาใส่ชื่อเรื่อง");
    if (!slotId) return setError("กรุณาเลือกโลกที่จะเผยแพร่");
    setBusy(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");

      const coverUrl = buildWorldCoverUrl(title.trim(), selectedSlot?.genre ?? "");
      const res = await fetch("/api/store/worlds", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          saveSlotId: slotId,
          title: title.trim(),
          synopsis: synopsis.trim(),
          tropeTags: tags,
          isPremium,
          priceCoins: 0,
          coverUrl,
          coverType: "auto",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onPublished();
    } catch (err) {
      console.error("Publish failed:", err);
      setError(err instanceof Error ? err.message : "เผยแพร่ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const signedOut = !user;
  const noSlots = save_slots.length === 0;

  return (
    <Modal onDismiss={onClose} size="lg">
        <div className="relative flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black tracking-wide text-white">เผยแพร่โลก</h2>
            <p className="mt-1 text-sm text-neutral-500">แชร์โลกของคุณสู่ตลาด</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {signedOut || noSlots ? (
          <div className="relative mt-8 grid place-items-center rounded-2xl border border-amber-900/30 bg-white/[0.02] py-12 text-center">
            <Lock size={30} className="text-amber-700/60" />
            <p className="mt-4 text-sm font-semibold text-neutral-300">
              {signedOut ? "เข้าสู่ระบบเพื่อเผยแพร่โลก" : "คุณยังไม่มีโลกที่บันทึกไว้"}
            </p>
            <p className="mt-1 max-w-xs text-xs text-neutral-600">
              {signedOut
                ? "เฉพาะครีเอเตอร์ที่เข้าสู่ระบบเท่านั้นที่เผยแพร่สู่ตลาดได้"
                : "สร้างและเล่นโลกก่อน — แล้วจึงเผยแพร่ที่นี่ได้"}
            </p>
          </div>
        ) : (
          <>
            {/* World picker */}
            <div className="relative mt-6">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">โลกไหน?</span>
              <div className="mt-2 max-h-32 space-y-1.5 overflow-y-auto pr-1">
                {save_slots.map((slot) => {
                  const sel = slot.id === slotId;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => chooseSlot(slot.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                        sel ? "border-amber-600/50 bg-amber-500/10 text-white" : "border-amber-900/25 bg-white/[0.02] text-neutral-400 hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="truncate font-medium">{slot.world_name || "โลกไร้ชื่อ"}</span>
                      <span className="ml-3 shrink-0 text-[11px] text-neutral-600">{slot.genre}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="relative mt-5">
              <label htmlFor="publish-world-title" className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">ชื่อประกาศ</label>
              <input
                id="publish-world-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น นางร้ายพลิกเวลาย้อนคืน"
                className="mt-2 w-full rounded-xl border border-amber-900/30 bg-white/5 px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Synopsis */}
            <div className="relative mt-4">
              <label htmlFor="publish-world-synopsis" className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">เรื่องย่อ</label>
              <textarea
                id="publish-world-synopsis"
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                rows={2}
                placeholder="ประโยคเด็ดหนึ่งบรรทัดที่ขายโลกของคุณ…"
                className="mt-2 w-full resize-none rounded-xl border border-amber-900/30 bg-white/5 px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Tropes */}
            <div className="relative mt-4">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">ธีม (สูงสุด 6)</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TROPES.map((t) => {
                  const sel = tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        sel ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white" : "bg-white/[0.04] text-neutral-400 ring-1 ring-amber-900/25 hover:text-amber-100"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility — coin pricing is hidden until the economy ships */}
            <div className="relative mt-5">
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input type="checkbox" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} className="accent-amber-500" />
                ทำเป็นพรีเมียม
              </label>
              <p className="mt-1.5 text-xs text-neutral-600">
                {isPremium ? "ถูกไฮไลต์เป็นโลกพรีเมียม" : "เผยแพร่ฟรีสำหรับทุกคน"}
              </p>
            </div>

            {error && <p className="relative mt-4 text-xs text-red-400">{error}</p>}

            <div className="relative mt-7 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold text-neutral-300 ring-1 ring-amber-900/25 transition hover:bg-white/10">
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={busy}
                className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3 text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(217,119,6,0.6)] transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {busy ? "กำลังเผยแพร่…" : "เผยแพร่สู่ตลาด"}
              </button>
            </div>
          </>
        )}
    </Modal>
  );
}

/* ============================================================
   STATES
   ============================================================ */

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white/[0.02] ring-1 ring-amber-900/20">
      <div className="aspect-[3/4] animate-pulse bg-white/[0.04]" />
      <div className="space-y-2 p-3.5">
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.04]" />
      </div>
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */

export default function StorePage() {
  const router = useRouter();
  const { user, energy, setGameState } = useGameStore();

  const [tab, setTab] = useState<Tab>("explore");
  const [showPublish, setShowPublish] = useState(false);
  const [query, setQuery] = useState("");

  const [worlds, setWorlds] = useState<World[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [trope, setTrope] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("popular");
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<World | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch on mount and whenever tab / trope / sort / reload changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ sort });
        if (trope) params.set("trope", trope);
        const headers: Record<string, string> = {};
        if (tab === "library") {
          params.set("mine", "1");
          const { data: { session } } = await getSupabaseClient().auth.getSession();
          if (!session?.access_token) {
            if (!cancelled) { setWorlds([]); setStatus("ready"); }
            return;
          }
          headers.Authorization = `Bearer ${session.access_token}`;
        }
        const res = await fetch(`/api/store/worlds?${params.toString()}`, { headers });
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
    return () => { cancelled = true; };
  }, [tab, trope, sort, reloadKey]);

  const switchTab = useCallback((t: Tab) => { setStatus("loading"); setTab(t); }, []);
  const selectTrope = useCallback((t: string | null) => { setStatus("loading"); setTrope(t); }, []);
  const selectSort = useCallback((key: SortKey) => { setStatus("loading"); setSort(key); }, []);
  const retry = useCallback(() => { setStatus("loading"); setReloadKey((k) => k + 1); }, []);

  const openWorld = useCallback((world: World) => { router.push(`/store/${world.id}`); }, [router]);
  // /store does not mount usePhaseSync, so setting game_phase alone won't navigate —
  // push the landing route explicitly (game_phase makes it render MainMenuDashboard).
  const goHome = useCallback(() => { setGameState({ game_phase: "Dashboard" }); router.push("/"); }, [setGameState, router]);

  const onPublished = useCallback(() => {
    setShowPublish(false);
    setStatus("loading");
    setTab("library");
    setReloadKey((k) => k + 1);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      const res = await fetch(`/api/store/worlds/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Drop it from the current list without a full refetch.
      setWorlds((prev) => prev.filter((w) => w.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  const initials = useMemo(() => (user?.email ?? "?").slice(0, 2).toUpperCase(), [user]);

  // Live client-side search over the already-loaded worlds (title + trope tags).
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return worlds;
    return worlds.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.trope_tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [worlds, q]);

  // Hero only makes sense for an unfiltered Explore listing.
  const showHero = tab === "explore" && !q;
  const hero = showHero ? filtered[0] : undefined;
  const grid = hero ? filtered.slice(1) : filtered;

  let emptyHint: string;
  if (q) emptyHint = `ไม่มีโลกที่ตรงกับ "${query.trim()}"`;
  else if (tab === "library") emptyHint = "เผยแพร่โลกที่บันทึกไว้เพื่อให้ปรากฏที่นี่";
  else if (trope) emptyHint = `เป็นคนแรกที่เผยแพร่โลกแนว ${trope}`;
  else emptyHint = "เป็นคนแรกที่เผยแพร่โลก";

  return (
    <div className="relative min-h-screen bg-[#07050a] text-neutral-200">
      <style>{`
        @keyframes floatGlow { 0%, 100% { opacity: 0.4; transform: translateY(0) } 50% { opacity: 0.7; transform: translateY(-14px) } }
      `}</style>

      {/* Atmospheric background — matches the main menu */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_65%_at_88%_5%,rgba(180,83,9,0.16),transparent_70%)]" />
        <div className="absolute -left-40 top-10 h-[32rem] w-[32rem] rounded-full bg-amber-700/[0.07] blur-3xl [animation:floatGlow_10s_ease-in-out_infinite]" />
        <div className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-orange-800/[0.06] blur-3xl [animation:floatGlow_13s_ease-in-out_infinite_1s]" />
      </div>

      <div className="relative flex">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-amber-900/20 bg-white/[0.015] p-5 backdrop-blur-2xl lg:flex">
          <button type="button" onClick={goHome} className="flex items-center gap-2 text-neutral-600 transition-colors hover:text-amber-300">
            <ArrowLeft size={13} />
            <span className="text-xs uppercase tracking-widest">เมนูหลัก</span>
          </button>

          <div className="px-1">
            <p className="text-sm font-black tracking-[0.15em] text-white">STORYWEAVE</p>
            <p className="text-[10px] uppercase tracking-widest text-amber-800/70">ตลาดโลก</p>
          </div>

          <nav className="flex flex-col gap-1">
            {([
              { id: "explore", label: "สำรวจโลก", icon: Compass },
              { id: "library", label: "คลังของฉัน", icon: Library },
            ] as const).map(({ id, label, icon: Icon }) => {
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchTab(id)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500/15 to-transparent text-white ring-1 ring-amber-600/30"
                      : "text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-200"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-amber-300" : ""} />
                  <span className="font-medium tracking-wide">{label}</span>
                  {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_2px_rgba(217,119,6,0.7)]" />}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setShowPublish(true)}
            className="group relative mt-2 overflow-hidden rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(217,119,6,0.5)] transition-all duration-300 hover:brightness-110"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Wand2 size={16} /> เผยแพร่โลก
            </span>
          </button>

          <div className="mt-auto rounded-xl border border-amber-900/20 bg-white/[0.02] p-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-600 to-orange-700 text-xs font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-neutral-200">{user?.email ?? "ผู้เยี่ยมชม"}</p>
                <p className="flex items-center gap-1 text-[11px] text-amber-300/80">
                  <Zap size={11} className="fill-amber-300/80" /> {energy} พลังงาน
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-amber-900/20 bg-[#07050a]/70 px-5 py-4 backdrop-blur-xl sm:px-8">
            <button type="button" onClick={goHome} className="grid h-9 w-9 place-items-center rounded-xl text-neutral-500 ring-1 ring-amber-900/25 transition hover:text-amber-300 lg:hidden">
              <ArrowLeft size={16} />
            </button>
            <div className="relative max-w-md flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาโลกหรือธีม…"
                className="w-full rounded-xl border border-amber-900/25 bg-white/5 py-2.5 pl-10 pr-9 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15"
              />
              {query && (
                <button
                  type="button"
                  aria-label="ล้างการค้นหา"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded-full text-neutral-500 transition hover:bg-white/10 hover:text-neutral-200"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowPublish(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 lg:hidden"
            >
              <Wand2 size={16} /> เผยแพร่
            </button>
            <span className="hidden items-center gap-1.5 rounded-xl bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-amber-300 ring-1 ring-amber-900/25 sm:flex">
              <Zap size={15} className="fill-amber-300" /> {energy}
            </span>
          </header>

          <div className="mx-auto max-w-7xl space-y-10 px-5 py-8 sm:px-8">
            {/* Hero (Explore only) */}
            {showHero && status === "ready" && hero && <HeroBanner world={hero} onOpen={openWorld} />}
            {showHero && status === "loading" && <div className="h-64 animate-pulse rounded-3xl bg-white/[0.03] ring-1 ring-amber-900/20" />}

            {/* Tropes (Explore only) */}
            {tab === "explore" && (
              <section className="space-y-4">
                <h2 className="text-lg font-bold tracking-wide text-white">เลือกดูตามธีม</h2>
                <TropeTags selected={trope} onSelect={selectTrope} />
              </section>
            )}

            {/* Grid */}
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-wide text-white">
                    {tab === "library" ? "โลกที่ฉันเผยแพร่" : trope ? `โลกแนว ${trope}` : "โลกมาแรง"}
                  </h2>
                  <p className="text-sm text-neutral-600">
                    {tab === "library" ? "โลกที่คุณแชร์กับชุมชน" : "สดใหม่จากชุมชน"}
                  </p>
                </div>
                {tab === "explore" && (
                  <div className="hidden rounded-lg bg-white/5 p-1 ring-1 ring-amber-900/25 sm:flex">
                    {(["popular", "newest"] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectSort(key)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                          sort === key ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white" : "text-neutral-500 hover:text-white"
                        }`}
                      >
                        {key === "popular" ? "ยอดนิยม" : "ใหม่ล่าสุด"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {status === "loading" && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {SKELETON_KEYS.map((k) => <CardSkeleton key={k} />)}
                </div>
              )}

              {status === "error" && (
                <div className="grid place-items-center rounded-2xl border border-red-500/20 bg-red-500/5 py-16 text-center">
                  <p className="text-sm font-semibold text-red-300">โหลดโลกไม่สำเร็จ</p>
                  <button type="button" onClick={retry} className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-amber-900/25 transition hover:bg-white/15">
                    <Loader2 size={14} /> ลองใหม่
                  </button>
                </div>
              )}

              {status === "ready" && grid.length === 0 && !hero && (
                <div className="grid place-items-center rounded-2xl border border-amber-900/25 bg-white/[0.02] py-20 text-center">
                  <Ghost size={40} className="text-amber-900/50" />
                  <p className="mt-4 text-sm font-semibold text-neutral-300">
                    {tab === "library" ? "คุณยังไม่ได้เผยแพร่โลกใดๆ" : "ยังไม่มีโลกที่นี่"}
                  </p>
                  <p className="mt-1 text-xs text-neutral-600">{emptyHint}</p>
                  <button type="button" onClick={() => setShowPublish(true)} className="mt-5 flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110">
                    <Wand2 size={14} /> เผยแพร่โลก
                  </button>
                </div>
              )}

              {status === "ready" && grid.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {grid.map((world) => (
                    <WorldCard
                      key={world.id}
                      world={world}
                      onOpen={openWorld}
                      onDelete={tab === "library" ? setDeleteTarget : undefined}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {showPublish && <PublishModal onClose={() => setShowPublish(false)} onPublished={onPublished} />}

      {deleteTarget && (
        <ConfirmModal
          variant="danger"
          title="นำโลกนี้ออก?"
          message={`นำ "${deleteTarget.title}" ออกจากตลาด? ผู้เล่นจะหาไม่เจออีกต่อไป การกระทำนี้ย้อนกลับไม่ได้`}
          confirmText={deleting ? "กำลังนำออก…" : "นำออก"}
          cancelText="ยกเลิก"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
