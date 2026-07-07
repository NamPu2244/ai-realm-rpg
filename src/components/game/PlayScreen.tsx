"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGameStore, WorldConfig, ChatLog, OpenThread, CountdownEvent, genreToTheme } from "@/store/useGameStore";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AlertModal, ConfirmModal } from "@/components/ui/Modal";
import JournalModal from "@/components/game/JournalModal";
import CharacterDossierModal from "@/components/game/CharacterDossierModal";
import QTEOverlay from "@/components/game/QTEOverlay";
import CountdownBanner from "@/components/game/CountdownBanner";
import ChatHistory from "@/components/game/ChatHistory";
import GameHeader from "@/components/game/GameHeader";
import SceneBanner from "@/components/game/SceneBanner";
import ActionBar from "@/components/game/ActionBar";
import CharacterSidebar from "@/components/game/CharacterSidebar";
import MobileStatsDrawer from "@/components/game/MobileStatsDrawer";
import SettingsModal from "@/components/game/SettingsModal";
import FeedbackModal from "@/components/game/FeedbackModal";
import EnergyModal from "@/components/game/EnergyModal";
import { Heart, MessageSquare } from "lucide-react";
import WorldLoadingScreen from "@/components/WorldLoadingScreen";
import {
  SCENE_DELIM,
  WORLD_EVENT_TYPES,
  buildWorldEventSignal,
  isWorldEventSignal,
  buildCountdownExpiredSignal,
  isWorldSideSignal,
  getWorldSideDisplay,
  buildSceneImageUrl,
} from "@/lib/gameText";
import { playQteSelect, playAmbient } from "@/lib/sounds";
import { useGameEffects } from "@/hooks/useGameEffects";
import { useQteTimer } from "@/hooks/useQteTimer";
import { useCountdownTimer } from "@/hooks/useCountdownTimer";
import { usePhaseSync } from "@/lib/phaseRoute";

export default function PlayScreen() {
  const router = useRouter();
  const {
    player_status,
    is_dead,
    game_phase,
    history,
    story_summary,
    current_image_prompt,
    suggested_actions,
    current_objective,
    world_config,
    is_qte_active,
    qte_time_limit,
    qte_options,
    lives_left,
    known_characters,
    time_of_day,
    in_world_date,
    quest_log,
    faction_standings,
    companions,
    visited_locations,
    open_threads,
    active_countdown,
    auth_status,
    groq_api_key,
    energy,
    sync_error,
    setGameState,
    setEnergy,
    resetGame,
    syncCurrentGameToCloud,
    quitToMainMenu,
  } = useGameStore();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingNarrative, setStreamingNarrative] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<{
    newHistory: ChatLog[];
    message: string;
    worldConfig: WorldConfig | null;
  } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const ambientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showJournal, setShowJournal] = useState(false);
  const [showDossier, setShowDossier] = useState(false);
  const [worldLoading, setWorldLoading] = useState<{
    active: boolean;
    config: WorldConfig | null;
    prologue: string | null;
  }>({ active: false, config: null, prologue: null });

  const prefetchCacheRef = useRef<Map<string, unknown>>(new Map());
  const prefetchControllersRef = useRef<AbortController[]>([]);
  // Synchronous in-flight lock for handleSend. `isLoading` (React state) only disables the
  // buttons after a re-render, leaving a race window where a fast second click/keypress fires
  // a duplicate turn. A ref flips synchronously and closes that window.
  const inFlightRef = useRef(false);
  const onFirstTurnCompleteRef = useRef<((prologue?: string) => void) | null>(null);
  const lastWorldEventTypeRef = useRef<string | null>(null);
  const [showMobileStats, setShowMobileStats] = useState(false);

  const cancelPrefetches = () => {
    for (const ac of prefetchControllersRef.current) {
      try { ac.abort(); } catch {}
    }
    prefetchControllersRef.current = [];
  };
  const [lastStatChange, setLastStatChange] = useState<{ hp: number; mana: number } | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const statChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showEnergyModal, setShowEnergyModal] = useState(false);
  const [alertInfo, setAlertInfo] = useState<string | null>(null);
  const [confirmInfo, setConfirmInfo] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Mirror game_phase to the URL: if the game is quit / abandoned, game_phase
  // flips to Dashboard and this bounces us back to the landing route.
  const hydrated = usePhaseSync("/play");

  const hpPercent =
    player_status.max_hp > 0
      ? (player_status.hp / player_status.max_hp) * 100
      : 100;

  const sceneImageUrl = useMemo(
    () => (current_image_prompt ? buildSceneImageUrl(current_image_prompt, world_config?.tone) : null),
    [current_image_prompt, world_config?.tone],
  );
  const isLowHp = hpPercent <= 30 && hpPercent > 0 && game_phase === "Playing";
  // Energy only depletes for authenticated users (the server-side guard is auth-only),
  // so a guest's static 50 never trips this. MAX_ENERGY is 50, so <10 ≈ below 20%.
  const isLowEnergy =
    auth_status === "authenticated" && energy < 10 && game_phase === "Playing";
  // Critical = HP or energy below ~20%; drives the pulsing red edge vignette.
  const isCritical = (hpPercent > 0 && hpPercent < 20) || isLowEnergy;

  // Extracted hooks
  const { isShaking, isDamageFlash, showLevelUp, levelUpNum } = useGameEffects(
    player_status.hp,
    player_status.level,
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, streamingNarrative]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
      if (statChangeTimerRef.current) clearTimeout(statChangeTimerRef.current);
      cancelPrefetches();
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyGameResult = (data: any, newHistory: ChatLog[], worldConfig: WorldConfig | null, message: string, isSystemInit: boolean, onSend: typeof handleSend) => {
    const freshState = useGameStore.getState();
    const prevHp = freshState.player_status.hp;
    const prevMana = freshState.player_status.mana;
    const newHp = data.player_status?.hp ?? prevHp;
    const newMana = data.player_status?.mana ?? prevMana;
    const hpDelta = newHp - prevHp;
    const manaDelta = newMana - prevMana;

    if (hpDelta !== 0 || manaDelta !== 0) {
      if (statChangeTimerRef.current) clearTimeout(statChangeTimerRef.current);
      setLastStatChange({ hp: hpDelta, mana: manaDelta });
      statChangeTimerRef.current = setTimeout(() => setLastStatChange(null), 4000);
    } else {
      setLastStatChange(null);
    }

    const suggestedActions: string[] = Array.isArray(data.suggested_actions) ? data.suggested_actions : [];
    const prevLives = freshState.lives_left;
    const newLives = typeof data.lives_left === "number" ? data.lives_left : prevLives;
    const respawned = newLives < prevLives && !data.is_dead;

    let playerStatus = { ...freshState.player_status, ...data.player_status };
    if (respawned) {
      playerStatus = { ...playerStatus, hp: playerStatus.max_hp, inventory: [] };
    }

    const updatedCharacters = { ...freshState.known_characters };
    if (Array.isArray(data.character_updates)) {
      for (const entry of data.character_updates) {
        if (entry?.name) updatedCharacters[entry.name] = entry;
      }
    }

    const updatedFactions = [...freshState.faction_standings];
    if (Array.isArray(data.faction_updates)) {
      for (const fu of data.faction_updates) {
        if (!fu?.name) continue;
        const idx = updatedFactions.findIndex((f) => f.name === fu.name);
        if (idx >= 0) updatedFactions[idx] = { ...updatedFactions[idx], ...fu };
        else updatedFactions.push(fu);
      }
    }

    const updatedQuests = [...freshState.quest_log];
    if (Array.isArray(data.quest_updates)) {
      for (const qu of data.quest_updates) {
        if (!qu?.id) continue;
        const idx = updatedQuests.findIndex((q) => q.id === qu.id);
        if (idx >= 0) updatedQuests[idx] = { ...updatedQuests[idx], ...qu };
        else updatedQuests.push(qu);
      }
    }

    const updatedCompanions = { ...freshState.companions };
    if (Array.isArray(data.companion_updates)) {
      for (const cu of data.companion_updates) {
        if (cu?.name) updatedCompanions[cu.name] = cu;
      }
    }

    const existingNames = new Set(freshState.visited_locations.map((l) => l.name));
    const newLocs = Array.isArray(data.new_locations)
      ? data.new_locations.filter((l: { name: string }) => l?.name && !existingNames.has(l.name))
      : [];
    const updatedLocations = [...freshState.visited_locations, ...newLocs];

    let newCountdown: CountdownEvent | null = freshState.active_countdown;
    if (data.countdown_event === null || data.countdown_event === undefined) {
      newCountdown = null;
    } else if (
      data.countdown_event &&
      typeof data.countdown_event.label === "string" &&
      typeof data.countdown_event.seconds === "number"
    ) {
      if (!freshState.active_countdown || freshState.active_countdown.label !== data.countdown_event.label) {
        newCountdown = { label: data.countdown_event.label, seconds: data.countdown_event.seconds, started_at: Date.now() };
      }
    }

    setGameState({
      player_status: playerStatus,
      story_summary: data.story_summary,
      current_objective: data.current_objective || "",
      is_dead: !!data.is_dead,
      current_image_prompt: data.scene_image_prompt || freshState.current_image_prompt,
      suggested_actions: suggestedActions,
      is_qte_active: !!data.is_qte_active,
      qte_time_limit: typeof data.qte_time_limit === "number" ? data.qte_time_limit : 0,
      qte_options: Array.isArray(data.qte_options) ? data.qte_options : [],
      lives_left: newLives,
      active_countdown: newCountdown,
      known_characters: updatedCharacters,
      time_of_day: typeof data.time_of_day === "string" ? data.time_of_day : freshState.time_of_day,
      in_world_date: typeof data.in_world_date === "string" ? data.in_world_date : freshState.in_world_date,
      faction_standings: updatedFactions,
      quest_log: updatedQuests,
      companions: updatedCompanions,
      visited_locations: updatedLocations,
      open_threads: Array.isArray(data.open_threads) ? (data.open_threads as OpenThread[]) : freshState.open_threads,
      history: [
        ...newHistory,
        {
          role: "gm",
          content: data.narrative,
          ...(data.prologue ? { prologue: data.prologue } : {}),
          ...(data.scene_image_prompt ? { scene_image_prompt: data.scene_image_prompt } : {}),
          ...(Array.isArray(data.dialogue_lines) && data.dialogue_lines.length > 0 ? { dialogue_lines: data.dialogue_lines } : {}),
        },
      ],
    });
    setStreamingNarrative("");
    setRetryAction(null);

    if (onFirstTurnCompleteRef.current) {
      onFirstTurnCompleteRef.current(data.prologue);
      onFirstTurnCompleteRef.current = null;
    }

    const isAmbientOrSystem = isWorldEventSignal(message) || isWorldSideSignal(message);
    if (isWorldEventSignal(message)) playAmbient();

    if (!isAmbientOrSystem && !isSystemInit && !data.is_dead && !data.is_qte_active && Math.random() < 0.25) {
      const delay = 6000 + Math.random() * 6000;
      ambientTimerRef.current = setTimeout(() => {
        const s = useGameStore.getState();
        if (!s.is_dead && !s.is_qte_active && s.game_phase === "Playing") {
          const available = WORLD_EVENT_TYPES.filter((t) => t !== lastWorldEventTypeRef.current);
          const picked = available[Math.floor(Math.random() * available.length)];
          lastWorldEventTypeRef.current = picked;
          onSend(buildWorldEventSignal(picked), true);
        }
      }, delay);
    }

    if (freshState.auth_status === "authenticated") {
      syncCurrentGameToCloud();
      const slotId = freshState.current_save_slot_id;
      const fullHistory = [...newHistory, { role: "gm" as const, content: data.narrative }];
      const gmCount = fullHistory.filter((h) => h.role === "gm").length;
      if (slotId && gmCount > 0 && gmCount % 10 === 0) {
        (async () => {
          try {
            const { data: { session } } = await getSupabaseClient().auth.getSession();
            await fetch("/api/memories", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
              },
              body: JSON.stringify({ saveSlotId: slotId, recentHistory: fullHistory.slice(-20) }),
            });
          } catch (err) {
            console.warn("[memories] background trigger failed:", err);
          }
        })();
      }
    }

    if (!isAmbientOrSystem && !isSystemInit && !data.is_dead && !data.is_qte_active && suggestedActions.length > 0) {
      cancelPrefetches();
      prefetchCacheRef.current.clear();

      const nextHistory = [...newHistory, { role: "gm" as const, content: data.narrative }];

      for (const action of suggestedActions.slice(0, 4)) {
        const controller = new AbortController();
        prefetchControllersRef.current.push(controller);

        (async () => {
          try {
            const res = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: action,
                history: nextHistory.slice(-10),
                currentState: data.player_status,
                currentSummary: data.story_summary,
                worldConfig,
                livesLeft: newLives,
                saveSlotId: freshState.current_save_slot_id ?? undefined,
                knownCharacters: updatedCharacters,
              }),
              signal: controller.signal,
            });

            if (!res.ok || !res.body) return;

            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let prefetchedState: Record<string, unknown> | null = null;
            let buf = "";

            const takeLine = (line: string) => {
              if (!line.trim()) return;
              try {
                const p = JSON.parse(line) as { game_state?: Record<string, unknown> };
                if (p.game_state && typeof p.game_state === "object") prefetchedState = p.game_state;
              } catch {}
            };

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += dec.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() || "";
              for (const line of lines) takeLine(line);
            }
            takeLine(buf);

            if (prefetchedState) prefetchCacheRef.current.set(action, prefetchedState);
          } catch (err) {
            if (!(err instanceof Error && err.name === "AbortError")) {
              console.warn("[prefetch]", action, err);
            }
          }
        })();
      }
    }
  };

  const runTurn = async (
    newHistory: ChatLog[],
    message: string,
    worldConfig: WorldConfig | null,
    isSystemInit = false,
  ) => {
    setIsLoading(true);
    setStreamingNarrative("");
    setError(null);

    try {
      const freshState = useGameStore.getState();
      const { data: { session } } = await getSupabaseClient().auth.getSession();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          prompt: message,
          history: newHistory.slice(-10),
          currentState: freshState.player_status,
          currentSummary: freshState.story_summary,
          worldConfig,
          livesLeft: freshState.lives_left,
          saveSlotId: freshState.current_save_slot_id ?? undefined,
          knownCharacters: freshState.known_characters,
          userGroqKey: freshState.groq_api_key || undefined,
        }),
      });

      if (!res.body) throw new Error("No response body");

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        if (errBody?.code === "OUT_OF_ENERGY") {
          setShowEnergyModal(true);
          return;
        }
        throw new Error(errBody?.error || `Request failed with status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      // The stream now carries PURE PROSE in `response` chunks (shown live), and the
      // structured state arrives once at the end in `game_state`.
      let narrativeBuf = "";
      let lineBuffer = "";
      let streamError: string | null = null;
      let streamedRemainingEnergy: number | null = null;
      let finalGameState: Record<string, unknown> | null = null;

      // On the first turn the prose is "prologue [[SCENE]] narrative"; only the part
      // after the marker is shown in the live chat (the prologue gets its own reveal).
      const displayNarrative = (buf: string) => {
        const idx = buf.indexOf(SCENE_DELIM);
        return idx === -1 ? buf : buf.slice(idx + SCENE_DELIM.length).replace(/^\s+/, "");
      };

      const processLine = (line: string) => {
        if (line.trim() === "") return;
        try {
          const parsed = JSON.parse(line);
          if (typeof parsed.stream_error === "string") {
            streamError = parsed.stream_error;
            return;
          }
          if (typeof parsed.response === "string") {
            narrativeBuf += parsed.response;
            setStreamingNarrative(displayNarrative(narrativeBuf));
          }
          if (parsed.game_state && typeof parsed.game_state === "object") {
            finalGameState = parsed.game_state;
          }
          if (typeof parsed.remaining_energy === "number") {
            streamedRemainingEnergy = parsed.remaining_energy;
          }
        } catch (e) {
          console.error("Stream line parse error:", e, "Line:", line);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        lineBuffer += chunk;
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() || "";
        for (const line of lines) processLine(line);
      }
      processLine(lineBuffer);

      if (streamError) throw new Error(`Groq: ${streamError}`);

      if (streamedRemainingEnergy !== null) {
        setEnergy(streamedRemainingEnergy);
      }

      if (finalGameState) {
        applyGameResult(finalGameState, newHistory, worldConfig, message, isSystemInit, handleSend);
      } else {
        setGameState({ is_qte_active: false, qte_time_limit: 0, qte_options: [] });
        setError("AI returned an invalid response. Please try again.");
        setRetryAction({ newHistory, message, worldConfig });
        setStreamingNarrative("");
      }
    } catch (err) {
      console.error("Network Error:", err);
      const detail = err instanceof Error ? err.message : "";
      setGameState({ is_qte_active: false, qte_time_limit: 0, qte_options: [] });
      setError(
        detail
          ? `Failed to connect to AI: ${detail}`
          : "Failed to connect to AI. Please try again.",
      );
      setRetryAction({ newHistory, message, worldConfig });
      setStreamingNarrative("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (
    message: string,
    isSystemInit = false,
    worldConfigOverride?: WorldConfig,
  ) => {
    if (!message.trim() && !isSystemInit) return;
    // Reject a reentrant send while a turn is already in flight. This closes the race that
    // `isLoading` (async state) can't: a fast double-click/keypress on a not-yet-disabled
    // button would otherwise fire the same action twice. Cleared in the finally below, in
    // lockstep with runTurn's setIsLoading(false).
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      if (ambientTimerRef.current) {
        clearTimeout(ambientTimerRef.current);
        ambientTimerRef.current = null;
      }

      const worldConfig = worldConfigOverride || world_config;
      setInput("");

      const isNoResponse = message === "[no response]";
      // A world/GM-side beat the player did NOT cause (QTE / countdown timing out while
      // the player stood still). It still runs an API turn so the GM narrates the fallout,
      // but it is logged as a neutral 'system' marker — never a player action bubble.
      const isWorldSide = isWorldSideSignal(message);

      const apiMessage = isNoResponse
        ? "[no response]: The player character stands completely silent and still, taking no action. Time passes briefly. Please advance the scene without any player action."
        : message;

      let newHistory: ChatLog[];
      if (isWorldSide) {
        newHistory = [...history, { role: "system" as const, content: getWorldSideDisplay(message, worldConfig?.language) }];
        setGameState({ history: newHistory });
      } else if (isSystemInit) {
        newHistory = useGameStore.getState().history;
      } else {
        newHistory = [...history, { role: "player" as const, content: message }];
        setGameState({ history: newHistory });
      }

      const canUsePrefetch = !isSystemInit && !isNoResponse && !isWorldSide && !isWorldEventSignal(message);
      const cached = canUsePrefetch ? prefetchCacheRef.current.get(message) : null;
      cancelPrefetches();
      prefetchCacheRef.current.clear();

      if (cached) {
        applyGameResult(cached, newHistory, worldConfig, message, false, handleSend);
        return;
      }

      await runTurn(newHistory, apiMessage, worldConfig, isSystemInit);
    } finally {
      inFlightRef.current = false;
    }
  };

  const handleRetry = () => {
    if (!retryAction) return;
    runTurn(retryAction.newHistory, retryAction.message, retryAction.worldConfig);
  };

  // Keyboard shortcuts: 1-4 to select suggested actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (is_qte_active || isLoading || is_dead) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = Number.parseInt(e.key) - 1;
      if (idx >= 0 && idx < suggested_actions.length) {
        handleSend(suggested_actions[idx]);
      }
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_qte_active, isLoading, is_dead, suggested_actions]);

  // QTE timer (extracted hook)
  const { qteTimeLeft } = useQteTimer(
    is_qte_active,
    qte_time_limit,
    isLoading,
    handleSend,
  );

  // Countdown timer (extracted hook)
  const { countdownSecondsLeft } = useCountdownTimer(
    active_countdown,
    (label) => handleSend(buildCountdownExpiredSignal(label)),
  );

  // Kick off the opening turn for a freshly created world. World creation
  // (`/create`) sets `world_config` + clears `history`, then routes here; a
  // continued/loaded save arrives with history already populated and skips this.
  const firstTurnStartedRef = useRef(false);
  useEffect(() => {
    if (!hydrated || firstTurnStartedRef.current) return;
    const s = useGameStore.getState();
    if (s.game_phase === "Playing" && s.world_config && s.history.length === 0) {
      firstTurnStartedRef.current = true;
      const config = s.world_config;
      onFirstTurnCompleteRef.current = (prologueText) => {
        setWorldLoading((prev) => ({ ...prev, prologue: prologueText ?? "" }));
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWorldLoading({ active: true, config, prologue: null });
      handleSend("Begin the adventure.", true, config);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const handleRetryWorldCreation = () => {
    if (!worldLoading.config) return;
    setGameState({ history: [] });
    setWorldLoading((prev) => ({ ...prev, prologue: null }));
    onFirstTurnCompleteRef.current = (prologueText) => {
      setWorldLoading((prev) => ({ ...prev, prologue: prologueText ?? "" }));
    };
    handleSend("Begin the adventure.", true, worldLoading.config);
  };

  const handleRestart = () => {
    resetGame();
    useGameStore.persist.clearStorage();
    router.replace("/");
  };

  const handleNewGame = () => {
    setConfirmInfo({
      message: "Start a new game and return to the world creation screen? Your current progress will be lost.",
      onConfirm: () => {
        setConfirmInfo(null);
        handleRestart();
      },
    });
  };

  const handleExportSave = () => {
    const state = useGameStore.getState();
    const saveData = {
      player_status: state.player_status,
      is_dead: state.is_dead,
      game_phase: state.game_phase,
      history: state.history,
      story_summary: state.story_summary,
      current_image_prompt: state.current_image_prompt,
      suggested_actions: state.suggested_actions,
      current_objective: state.current_objective,
      world_config: state.world_config,
      lives_left: state.lives_left,
      known_characters: state.known_characters,
      time_of_day: state.time_of_day,
      in_world_date: state.in_world_date,
      quest_log: state.quest_log,
      faction_standings: state.faction_standings,
      companions: state.companions,
      visited_locations: state.visited_locations,
      open_threads: state.open_threads,
    };

    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `storyweave-save-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportStory = () => {
    const state = useGameStore.getState();
    const worldName = state.world_config?.worldName || state.world_config?.genre || "Storyweave";
    const lines: string[] = [
      `═══════════════════════════════════════`,
      `  ${worldName.toUpperCase()}`,
      `  STORYWEAVE — Adventure Log`,
      `═══════════════════════════════════════`,
      `Character : ${state.world_config?.character || "-"}`,
      `Genre     : ${state.world_config?.genre || "-"}`,
      `Tone      : ${state.world_config?.tone || "-"}`,
      `Exported  : ${new Date().toLocaleString("en-US")}`,
      `═══════════════════════════════════════`,
      "",
    ];

    for (const entry of state.history) {
      if (entry.role === "player") {
        lines.push(`▶ Player: ${entry.content}`);
      } else if (entry.role === "system") {
        lines.push(`⏳ ${entry.content}`);
      } else {
        if (entry.prologue) {
          lines.push("", `[Prologue]`, entry.prologue, "");
        }
        lines.push(``, `📖 GM:`, entry.content, "");
      }
    }

    if (state.story_summary) {
      lines.push("═══════════════════════════════════════", "", "[Story Summary]", state.story_summary);
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `storyweave-story-${timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSave = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (typeof reader.result !== "string") throw new TypeError("Invalid save file");
        const data = JSON.parse(reader.result);
        if (!data.player_status || !data.world_config) throw new Error("Invalid save file");
        setGameState({
          player_status: {
            level: 1, exp: 0, skills: [], gold: 0,
            attributes: { str: 10, dex: 10, int: 10, con: 10, wis: 10, cha: 10 },
            ...data.player_status,
          },
          is_dead: !!data.is_dead,
          game_phase: "Playing",
          history: Array.isArray(data.history) ? data.history : [],
          story_summary: data.story_summary || "",
          current_image_prompt: data.current_image_prompt || "",
          suggested_actions: Array.isArray(data.suggested_actions) ? data.suggested_actions : [],
          current_objective: data.current_objective || "",
          world_config: data.world_config,
          lives_left: typeof data.lives_left === "number" ? data.lives_left : 3,
          is_qte_active: false,
          qte_time_limit: 0,
          qte_options: [],
          known_characters: (data.known_characters && typeof data.known_characters === "object") ? data.known_characters : {},
          time_of_day: data.time_of_day || "",
          in_world_date: data.in_world_date || "",
          quest_log: Array.isArray(data.quest_log) ? data.quest_log : [],
          faction_standings: Array.isArray(data.faction_standings) ? data.faction_standings : [],
          companions: (data.companions && typeof data.companions === "object") ? data.companions : {},
          visited_locations: Array.isArray(data.visited_locations) ? data.visited_locations : [],
          open_threads: Array.isArray(data.open_threads) ? data.open_threads : [],
        });
        setError(null);
        // A file import replaces the whole game; make sure we're on the play route.
        firstTurnStartedRef.current = true;
        router.replace("/play");
      } catch (err) {
        console.error("Import Error:", err);
        setAlertInfo("Invalid save file — cannot load.");
      }
    };
    reader.readAsText(file);
  };

  const renderScreen = () => {
    // Wait for hydration / the phase-sync guard before painting the game so a
    // direct visit to /play without a game doesn't flash before redirecting.
    if (!hydrated || !world_config || game_phase !== "Playing") {
      return null;
    }

    if (worldLoading.active && worldLoading.config) {
      return (
        <WorldLoadingScreen
          config={worldLoading.config}
          prologue={worldLoading.prologue}
          onEnter={() => setWorldLoading({ active: false, config: null, prologue: null })}
          onRetry={handleRetryWorldCreation}
        />
      );
    }

    const uiTheme = world_config?.ui_theme ?? genreToTheme(world_config?.genre ?? '');
    return (
      <div
        className={`relative flex h-screen bg-transparent text-theme-text font-sans transition-all duration-1000 ${uiTheme} ${isLowHp ? "shadow-[inset_0_0_150px_rgba(220,38,38,0.15)]" : ""} ${isShaking ? "animate-shake" : ""}`}
        style={{ ['--tw-selection-color' as string]: 'var(--theme-selection)' }}
      >
        {sceneImageUrl && (
          <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div
              className="absolute inset-0 scale-110"
              style={{
                backgroundImage: `url(${sceneImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(48px) brightness(0.20) saturate(0.9)",
              }}
            />
          </div>
        )}

        {isDamageFlash && (
          <div className="fixed inset-0 z-40 bg-red-700 animate-damage-flash pointer-events-none" />
        )}

        {isCritical && (
          <div
            aria-hidden="true"
            className="fixed inset-0 z-30 pointer-events-none animate-vignette-pulse shadow-[inset_0_0_160px_30px_rgba(220,38,38,0.55)]"
          />
        )}

        {sync_error && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-level-up-pop">
            <button
              onClick={() => setGameState({ sync_error: null })}
              className="px-5 py-3 bg-rose-950/90 border border-rose-500/50 rounded-xl shadow-[0_0_30px_rgba(244,63,94,0.25)] text-center"
            >
              <p className="text-xs text-rose-400/80 uppercase tracking-widest mb-0.5">Error</p>
              <p className="text-sm font-medium text-rose-200">{sync_error} <span className="text-rose-400/60">(tap to dismiss)</span></p>
            </button>
          </div>
        )}

        {showLevelUp && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-level-up-pop">
            <div className="px-8 py-3 bg-amber-900/90 border border-amber-400/60 rounded-xl shadow-[0_0_30px_rgba(251,191,36,0.4)] text-center">
              <p className="text-xs text-amber-400/80 uppercase tracking-widest mb-0.5">Level Up!</p>
              <p className="text-2xl font-bold text-amber-300">Level {levelUpNum}</p>
            </div>
          </div>
        )}

        {active_countdown && !isLoading && (
          <CountdownBanner
            label={active_countdown.label}
            secondsLeft={countdownSecondsLeft}
            totalSeconds={active_countdown.seconds}
          />
        )}

        {(() => {
          const criticalThreads = open_threads.filter(
            (t) => t.expires_in_turns !== null && t.expires_in_turns <= 1 && (t.urgency === 'critical' || t.urgency === 'high')
          );
          if (criticalThreads.length === 0 || isLoading) return null;
          return (
            <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
              {criticalThreads.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 px-4 py-2 text-xs font-mono border-b animate-pulse ${
                    t.urgency === 'critical'
                      ? 'bg-red-950/90 border-red-700 text-red-300'
                      : 'bg-orange-950/90 border-orange-700 text-orange-300'
                  }`}
                >
                  <span className="shrink-0 font-bold tracking-widest text-[10px]">
                    {t.urgency === 'critical' ? '⚡ FINAL TURN' : '⚠ LAST CHANCE'}
                  </span>
                  <span className="opacity-50">—</span>
                  <span className="truncate">{t.description}</span>
                </div>
              ))}
            </div>
          );
        })()}

        {is_qte_active && !isLoading && (
          <QTEOverlay
            qteTimeLeft={qteTimeLeft}
            qteTimeLimit={qte_time_limit}
            qteOptions={qte_options}
            isLoading={isLoading}
            onSelect={(option) => { playQteSelect(); handleSend(option); }}
          />
        )}

        {showJournal && (
          <JournalModal
            currentObjective={current_objective}
            storySummary={story_summary}
            worldConfig={world_config}
            questLog={quest_log}
            visitedLocations={visited_locations}
            onClose={() => setShowJournal(false)}
          />
        )}

        {showDossier && (
          <CharacterDossierModal
            characters={known_characters}
            onClose={() => setShowDossier(false)}
          />
        )}

        <div className="relative z-10 flex flex-1 min-w-0">
          <div className="flex-1 flex flex-col min-w-0 max-w-5xl mx-auto border-x border-amber-900/20 bg-stone-950/60 shadow-[inset_0_0_120px_rgba(0,0,0,0.4)]">
            <GameHeader
              worldConfig={world_config}
              isLowHp={isLowHp}
              authStatus={auth_status}
              hasPersonalKey={!!groq_api_key}
              energy={energy}
              timeOfDay={time_of_day}
              inWorldDate={in_world_date}
              importInputRef={importInputRef}
              onOpenJournal={() => setShowJournal(true)}
              onOpenDossier={() => setShowDossier(true)}
              onExportSave={handleExportSave}
              onExportStory={handleExportStory}
              onImportSave={handleImportSave}
              onQuitToDashboard={() => quitToMainMenu()}
              onNewGame={handleNewGame}
              onOpenSettings={() => setShowSettings(true)}
            />

            {current_image_prompt && (
              <SceneBanner imagePrompt={current_image_prompt} tone={world_config?.tone} />
            )}

            <ChatHistory
              history={history}
              streamingNarrative={streamingNarrative}
              isLoading={isLoading}
              chatEndRef={chatEndRef}
              lastStatChange={lastStatChange}
            />

            <ActionBar
              error={error}
              isLoading={isLoading}
              isDead={is_dead}
              suggestedActions={suggested_actions}
              input={input}
              isLowHp={isLowHp}
              worldTone={world_config?.tone}
              onInputChange={(value) => { setInput(value); if (value) cancelPrefetches(); }}
              onSend={(message) => handleSend(message)}
              onRetry={handleRetry}
              onRestart={handleRestart}
            />
          </div>

          <CharacterSidebar
            worldConfig={world_config}
            currentObjective={current_objective}
            playerStatus={player_status}
            isLowHp={isLowHp}
            livesLeft={lives_left}
            companions={companions}
            factionStandings={faction_standings}
            openThreads={open_threads}
            isLoading={isLoading}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowMobileStats(true)}
          aria-label="Open character status"
          className={`fixed bottom-24 right-4 z-30 lg:hidden flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl border shadow-lg backdrop-blur transition-colors ${isLowHp ? "bg-red-950/80 border-red-700/60 animate-pulse" : "bg-stone-900/80 border-amber-900/40"}`}
        >
          <Heart size={18} className={isLowHp ? "text-red-400 fill-red-400" : "text-amber-400 fill-amber-400"} />
          <span className={`text-xs font-bold tabular-nums leading-none ${isLowHp ? "text-red-400" : "text-amber-400"}`}>
            {player_status.hp}/{player_status.max_hp}
          </span>
        </button>

        <MobileStatsDrawer
          isOpen={showMobileStats}
          onClose={() => setShowMobileStats(false)}
          playerStatus={player_status}
          hpPercent={hpPercent}
          isLowHp={isLowHp}
          livesLeft={lives_left}
          currentObjective={current_objective}
          worldConfig={world_config}
          companions={companions}
          factionStandings={faction_standings}
        />

        <button
          type="button"
          onClick={() => setShowFeedback(true)}
          className="fixed bottom-6 left-6 z-30 flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/80 hover:bg-stone-800/90 text-neutral-500 hover:text-amber-300 border border-neutral-700/40 hover:border-amber-800/50 rounded-full text-xs transition-all shadow-lg backdrop-blur hover:-translate-y-0.5"
        >
          <MessageSquare size={12} /> Feedback
        </button>

        <SettingsModal
          isOpen={showSettings}
          groqApiKey={groq_api_key}
          onSave={(key) => { setGameState({ groq_api_key: key }); setShowSettings(false); }}
          onDelete={() => { setGameState({ groq_api_key: "" }); setShowSettings(false); }}
          onClose={() => setShowSettings(false)}
        />

        <FeedbackModal
          isOpen={showFeedback}
          onClose={() => setShowFeedback(false)}
        />

        <EnergyModal
          isOpen={showEnergyModal}
          onClose={() => setShowEnergyModal(false)}
        />
      </div>
    );
  };

  return (
    <>
      {renderScreen()}

      {alertInfo && (
        <AlertModal
          variant="danger"
          message={alertInfo}
          onClose={() => setAlertInfo(null)}
        />
      )}
      {confirmInfo && (
        <ConfirmModal
          variant="danger"
          title="Start New Game?"
          message={confirmInfo.message}
          confirmText="Start New"
          cancelText="Cancel"
          onConfirm={confirmInfo.onConfirm}
          onCancel={() => setConfirmInfo(null)}
        />
      )}
    </>
  );
}
