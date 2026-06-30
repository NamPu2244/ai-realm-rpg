"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft, LogOut, Plus, Play, Trash2, Clock,
  Swords, Skull, Settings, Power, ChevronRight,
} from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { ConfirmModal } from "@/components/ui/Modal";

type View = "menu" | "load" | "settings";

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: (i * 6.7) % 100,
  delay: (i * 1.9) % 10,
  duration: 14 + (i * 1.3) % 12,
  size: 1.5 + (i * 0.45) % 2,
}));

const MENU_ITEMS = [
  { id: "new",      num: "01", label: "New Game",  sub: "Create a brand new world",       icon: Plus },
  { id: "load",     num: "02", label: "Load Game", sub: "Continue from where you left off", icon: Play },
  { id: "settings", num: "03", label: "Settings",  sub: "Groq API Key and options",       icon: Settings },
  { id: "exit",     num: "04", label: "Exit",       sub: "Sign out and close the window",  icon: Power },
] as const;

function Ornament() {
  return (
    <div className="flex items-center gap-3 py-1 opacity-50">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-800/60 to-amber-800/60" />
      <span className="text-amber-700 text-[10px] leading-none">✦</span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-amber-800/60 to-amber-800/60" />
    </div>
  );
}

function BackButton({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-300 text-xs transition-colors duration-200 mb-8"
    >
      <ArrowLeft size={12} />
      <span className="tracking-wider uppercase">Back</span>
    </button>
  );
}

function SectionLabel({ text }: Readonly<{ text: string }>) {
  return (
    <div className="mb-5">
      <span className="text-[9px] text-neutral-700 tracking-[0.55em] uppercase">{text}</span>
    </div>
  );
}

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

export default function MainMenuDashboard() {
  const {
    user, save_slots, is_loading_saves, groq_api_key,
    setGameState, fetchUserSaves, loadSaveSlot, deleteSaveSlot, signOut,
  } = useGameStore();

  const [view, setView] = useState<View>("menu");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState(groq_api_key);

  useEffect(() => {
    if (user) fetchUserSaves(user.id);
  }, [user, fetchUserSaves]);

  const handleMenuAction = (id: typeof MENU_ITEMS[number]["id"]) => {
    if (id === "new") setGameState({ game_phase: "Menu" });
    else if (id === "load") setView("load");
    else if (id === "settings") { setApiKeyDraft(groq_api_key); setView("settings"); }
    else if (id === "exit") setShowExitConfirm(true);
  };

  const handleExit = async () => {
    await signOut();
    window.close();
  };

  const newWorldNum = String(save_slots.length + 1).padStart(2, "0");

  return (
    <div className="relative h-screen overflow-hidden bg-[#07050a] text-neutral-200">

      {/* ── Atmospheric background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_65%_at_88%_10%,rgba(180,83,9,0.22),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_26%_28%_at_82%_12%,rgba(251,191,36,0.07),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_28%_at_65%_72%,rgba(100,40,10,0.13),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_55%_at_0%_100%,rgba(40,15,70,0.18),transparent_68%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_95%_at_50%_50%,transparent_28%,rgba(0,0,0,0.55)_100%)]" />
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-amber-400/12"
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

      {/* ── Main layout ── */}
      <div className="relative z-10 flex h-full">

        {/* ── Left panel ── */}
        <div
          className="w-full md:w-[44%] flex flex-col h-full overflow-y-auto px-8 sm:px-12 md:px-14 lg:px-16 py-8 md:py-12"
          style={{ scrollbarWidth: "none" }}
        >
          {/* User row */}
          <div className="flex items-center justify-between mb-10 animate-[pageFadeIn_0.4s_ease-out_both]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-600/50 shadow-[0_0_4px_rgba(217,119,6,0.4)]" />
              <span className="text-neutral-600 text-xs truncate max-w-[190px]">{user?.email}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-1.5 text-neutral-700 hover:text-neutral-300 text-xs transition-colors duration-200"
            >
              <LogOut size={11} />
              <span className="tracking-wide">Sign out</span>
            </button>
          </div>

          {/* Game title — always visible */}
          <div className="mb-10 md:mb-12 animate-[pageFadeIn_0.5s_ease-out_0.06s_both]">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-5 bg-amber-700/50" />
              <span className="text-amber-700/50 text-[9px] tracking-[0.55em] uppercase font-medium">Text Adventure RPG</span>
            </div>
            <h1 className="leading-none font-black uppercase">
              <span className="block text-[54px] sm:text-[64px] md:text-[70px] lg:text-[82px] tracking-[0.18em] text-white">
                STORY
              </span>
              <span className="block text-[54px] sm:text-[64px] md:text-[70px] lg:text-[82px] tracking-[0.18em] text-amber-100/85 -mt-3 md:-mt-4">
                WEAVE
              </span>
            </h1>
            <div className="flex items-center gap-3 mt-4">
              <div className="h-px w-10 bg-gradient-to-r from-amber-700/50 to-transparent" />
              <span className="text-amber-800/40 text-[9px] tracking-[0.45em] uppercase">Powered by AI</span>
            </div>
          </div>

          {/* ── View content ── */}
          <div className="flex-1 animate-[pageFadeIn_0.5s_ease-out_0.12s_both]">

            {/* ── MAIN MENU ── */}
            {view === "menu" && (
              <>
                <SectionLabel text="— Main Menu —" />
                {MENU_ITEMS.map((item, i) => {
                  const Icon = item.icon;
                  const isDanger = item.id === "exit";
                  return (
                    <div key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleMenuAction(item.id)}
                        className="group w-full flex items-center gap-4 py-3 text-left"
                      >
                        {/* Number */}
                        <span className={`text-xs font-mono tabular-nums shrink-0 w-6 transition-colors duration-200 ${isDanger ? "text-red-900/50 group-hover:text-red-500/70" : "text-amber-800/50 group-hover:text-amber-400"}`}>
                          {item.num}
                        </span>
                        {/* Labels */}
                        <div className="flex-1 min-w-0">
                          <span className={`block text-sm sm:text-base font-semibold tracking-wider uppercase transition-colors duration-200 ${isDanger ? "text-neutral-500 group-hover:text-red-300" : "text-neutral-400 group-hover:text-white"}`}>
                            {item.label}
                          </span>
                          <span className={`text-[11px] mt-0.5 block transition-colors duration-200 ${isDanger ? "text-neutral-800 group-hover:text-red-900/60" : "text-neutral-700 group-hover:text-neutral-500"}`}>
                            {item.sub}
                          </span>
                        </div>
                        {/* Icon */}
                        <Icon size={13} className={`shrink-0 transition-colors duration-200 ${isDanger ? "text-neutral-800/40 group-hover:text-red-500/50" : "text-neutral-800/40 group-hover:text-amber-500/60"}`} />
                      </button>
                      {i < MENU_ITEMS.length - 1 && <Ornament />}
                    </div>
                  );
                })}
              </>
            )}

            {/* ── LOAD GAME ── */}
            {view === "load" && (
              <>
                <BackButton onClick={() => setView("menu")} />
                <SectionLabel text={save_slots.length > 0 ? "— Continue —" : "— Begin Your Journey —"} />

                {is_loading_saves ? (
                  <div className="space-y-5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-11 rounded bg-neutral-900/25 animate-pulse" style={{ animationDelay: `${i * 0.08}s` }} />
                    ))}
                  </div>
                ) : (
                  <>
                    {save_slots.map((slot, i) => {
                      const accentBar = slot.is_dead
                        ? "group-hover:bg-red-700/55"
                        : "group-hover:bg-amber-600/70";
                      const numColor = slot.is_dead
                        ? "text-red-900/50"
                        : "text-amber-800/50 group-hover:text-amber-400";
                      const titleColor = slot.is_dead
                        ? "text-neutral-700 line-through"
                        : "text-neutral-400 group-hover:text-white";
                      const statusIcon = slot.is_dead
                        ? <Skull size={12} className="text-neutral-800/35 group-hover:text-red-800/55 transition-colors duration-200" />
                        : <Play size={12} className="text-neutral-800/30 group-hover:text-amber-500/65 transition-colors duration-200" />;

                      return (
                        <div key={slot.id}>
                          <div className="group relative flex items-center gap-4 py-3">
                            <div className={`absolute -left-2 md:-left-3 inset-y-2 w-0.5 rounded-full bg-transparent transition-all duration-300 ${accentBar}`} />
                            <span className={`text-xs font-mono tabular-nums shrink-0 w-6 transition-colors duration-200 ${numColor}`}>
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <button
                              type="button"
                              onClick={() => loadSaveSlot(slot.id)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <span className={`block text-sm sm:text-base font-semibold tracking-wider uppercase transition-colors duration-200 ${titleColor}`}>
                                {slot.world_name || "Unnamed World"}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {slot.is_dead ? (
                                  <span className="flex items-center gap-1 text-[10px] text-red-900/65 uppercase tracking-wider">
                                    <Skull size={9} />
                                    {slot.tone === "hardcore" ? "Permadeath" : "Deceased"}
                                  </span>
                                ) : (
                                  slot.character && (
                                    <span className="text-[11px] truncate max-w-[140px] text-neutral-700 group-hover:text-neutral-500 transition-colors duration-200">
                                      {slot.character}
                                    </span>
                                  )
                                )}
                                <span className="flex items-center gap-1 text-[10px] ml-auto text-neutral-800 group-hover:text-neutral-600 transition-colors duration-200">
                                  <Clock size={9} />
                                  {formatTimestamp(slot.updated_at)}
                                </span>
                              </div>
                            </button>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: slot.id, name: slot.world_name }); }}
                                title="Delete this world"
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 text-red-900/55 hover:text-red-500/80"
                              >
                                <Trash2 size={12} />
                              </button>
                              {statusIcon}
                            </div>
                          </div>
                          {(i < save_slots.length - 1 || save_slots.length < 10) && <Ornament />}
                        </div>
                      );
                    })}

                    {save_slots.length < 10 && (
                      <button
                        type="button"
                        onClick={() => setGameState({ game_phase: "Menu" })}
                        className="group w-full flex items-center gap-4 py-3 text-left"
                      >
                        <span className="text-xs font-mono tabular-nums shrink-0 w-6 text-amber-800/50 group-hover:text-amber-400 transition-colors duration-200">
                          {newWorldNum}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm sm:text-base font-semibold tracking-wider uppercase text-neutral-500 group-hover:text-white transition-colors duration-200">
                            New World
                          </span>
                          <span className="text-[11px] text-neutral-700 group-hover:text-neutral-600 transition-colors duration-200 mt-0.5 block">
                            Start a new adventure
                          </span>
                        </div>
                        <Plus size={13} className="text-neutral-800/45 group-hover:text-amber-500/60 shrink-0 transition-colors duration-200" />
                      </button>
                    )}

                    {save_slots.length >= 10 && (
                      <div className="py-3 text-center">
                        <p className="text-neutral-700 text-xs tracking-wider">10-world limit reached — delete an old world to create a new one</p>
                      </div>
                    )}

                    {save_slots.length === 0 && (
                      <div className="py-10 flex flex-col items-center gap-3 text-center">
                        <Swords size={28} className="text-neutral-800" />
                        <p className="text-neutral-700 text-xs tracking-wider">No saved worlds yet</p>
                        <button
                          type="button"
                          onClick={() => setGameState({ game_phase: "Menu" })}
                          className="mt-2 flex items-center gap-1.5 text-amber-700/60 hover:text-amber-400 text-xs tracking-wider transition-colors"
                        >
                          <Plus size={11} /> Create a new world
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── SETTINGS ── */}
            {view === "settings" && (
              <>
                <BackButton onClick={() => setView("menu")} />
                <SectionLabel text="— Settings —" />

                <div className="space-y-6">
                  {/* API key status badge */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs text-neutral-500 uppercase tracking-widest">Groq API Key</span>
                    {groq_api_key ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 rounded-full px-2.5 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Personal Key
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/50 border border-amber-800/40 rounded-full px-2.5 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Shared Key
                      </span>
                    )}
                  </div>

                  <Ornament />

                  {/* Info box */}
                  <div className="space-y-3 text-xs text-neutral-500 leading-relaxed">
                    <div className="flex gap-2.5">
                      <span className="text-amber-600/70 shrink-0 mt-0.5">⚠</span>
                      <div>
                        <p className="text-neutral-400 font-medium mb-0.5">Shared Key — limited to 50 turns/day per IP</p>
                        <p>Resets at midnight UTC. Quota shared across all users.</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="text-emerald-600/70 shrink-0 mt-0.5">✓</span>
                      <div>
                        <p className="text-neutral-400 font-medium mb-0.5">Personal Key — no limit from us</p>
                        <p>Key is stored in your browser only and never sent to our servers.</p>
                      </div>
                    </div>
                  </div>

                  <Ornament />

                  {/* Input */}
                  <div className="space-y-2">
                    <label htmlFor="settings-groq-key" className="text-[11px] text-neutral-600 uppercase tracking-widest">
                      Enter your Groq API Key
                    </label>
                    <input
                      id="settings-groq-key"
                      type="password"
                      className="w-full bg-neutral-900/60 border border-neutral-800/80 rounded-lg px-3 py-2.5 text-sm text-neutral-200 placeholder-neutral-700 focus:outline-none focus:border-amber-700/50 font-mono transition-colors"
                      placeholder="gsk_..."
                      value={apiKeyDraft}
                      onChange={(e) => setApiKeyDraft(e.target.value)}
                    />
                    <p className="text-[11px] text-neutral-700">
                      Get a free key at{" "}
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-700/70 hover:text-amber-400 underline underline-offset-2 transition-colors"
                      >
                        console.groq.com/keys
                      </a>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    {groq_api_key && (
                      <button
                        type="button"
                        onClick={() => { setApiKeyDraft(""); setGameState({ groq_api_key: "" }); }}
                        className="text-xs text-red-800/60 hover:text-red-400/80 transition-colors"
                      >
                        Remove Key
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setGameState({ groq_api_key: apiKeyDraft.trim() }); setView("menu"); }}
                      className="ml-auto flex items-center gap-1.5 text-xs text-amber-700/70 hover:text-amber-300 uppercase tracking-widest transition-colors"
                    >
                      Save <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bottom bar */}
          <div className="mt-8 pt-4 border-t border-neutral-900/60 flex items-center justify-between animate-[pageFadeIn_0.5s_ease-out_0.24s_both]">
            <span className="text-neutral-800 text-[10px] tracking-[0.4em] uppercase">Storyweave</span>
            <span className="text-neutral-800 text-[10px]">Alpha</span>
          </div>
        </div>

        {/* ── Right panel: atmospheric art (desktop only) ── */}
        <div className="hidden md:block flex-1 relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-20 z-10 bg-gradient-to-r from-[#07050a] to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#030108] via-[#0a0514] to-[#100804]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_62%_20%,rgba(217,119,6,0.26),transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_24%_24%_at_62%_20%,rgba(251,191,36,0.10),transparent_52%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_22%_at_55%_70%,rgba(120,53,15,0.18),transparent)]" />
          <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-[#060302]/90 to-transparent" />

          {/* Ghost title watermark */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <div className="text-center">
              <div
                className="font-black tracking-[0.2em] uppercase leading-none"
                style={{ fontSize: "clamp(88px, 13vw, 172px)", color: "transparent", WebkitTextStroke: "1px rgba(217,119,6,0.13)" }}
              >
                STORY
              </div>
              <div
                className="font-black tracking-[0.2em] uppercase leading-none -mt-4"
                style={{ fontSize: "clamp(88px, 13vw, 172px)", color: "transparent", WebkitTextStroke: "1px rgba(217,119,6,0.10)" }}
              >
                WEAVE
              </div>
            </div>
            <div className="mt-10 flex items-center gap-5 opacity-20">
              <div className="h-px w-20 bg-gradient-to-r from-transparent to-amber-500" />
              <span className="text-amber-500 text-base">✦</span>
              <div className="h-px w-20 bg-gradient-to-l from-transparent to-amber-500" />
            </div>
            <p className="mt-5 text-[10px] tracking-[0.75em] uppercase text-amber-800/20 font-medium">
              Text Adventure RPG
            </p>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <ConfirmModal
          variant="danger"
          title="Sign Out?"
          message="Are you sure you want to sign out? Your progress has been saved."
          confirmText="Sign Out"
          cancelText="Cancel"
          onConfirm={() => { setShowLogoutConfirm(false); signOut(); }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}

      {/* Exit confirmation */}
      {showExitConfirm && (
        <ConfirmModal
          variant="danger"
          title="Exit Game?"
          message="Sign out and close the window? Your progress has been saved."
          confirmText="Exit"
          cancelText="Cancel"
          onConfirm={() => { setShowExitConfirm(false); handleExit(); }}
          onCancel={() => setShowExitConfirm(false)}
        />
      )}

      {/* Delete save confirmation */}
      {confirmDelete && (
        <ConfirmModal
          variant="danger"
          title="Delete This World?"
          message={`Delete "${confirmDelete.name}"? This cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => { deleteSaveSlot(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
