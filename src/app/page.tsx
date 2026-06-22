"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useGameStore, WorldConfig, ChatLog, OpenThread } from "@/store/useGameStore";
import WorldCreationMenu from "@/components/WorldCreationMenu";
import AuthScreen from "@/components/AuthScreen";
import MainMenuDashboard from "@/components/MainMenuDashboard";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { AlertModal, ConfirmModal } from "@/components/ui/Modal";
import JournalModal from "@/components/game/JournalModal";
import CharacterDossierModal from "@/components/game/CharacterDossierModal";
import QTEOverlay from "@/components/game/QTEOverlay";
import ChatHistory from "@/components/game/ChatHistory";
import GameHeader from "@/components/game/GameHeader";
import SceneBanner from "@/components/game/SceneBanner";
import ActionBar from "@/components/game/ActionBar";
import CharacterSidebar from "@/components/game/CharacterSidebar";
import MobileStatsDrawer from "@/components/game/MobileStatsDrawer";
import { Heart, MessageSquare } from "lucide-react";
import WorldLoadingScreen from "@/components/WorldLoadingScreen";
import {
  extractAndParseJSON,
  QTE_TIMEOUT_SIGNAL,
  WORLD_EVENT_TYPES,
  buildWorldEventSignal,
  isWorldEventSignal,
  getQteTimeoutDisplay,
  buildSceneImageUrl,
} from "@/lib/gameText";
import { playDamage, playLevelUp, playQteAlert, playQteSelect, playQteTimeout, playAmbient } from "@/lib/sounds";

export default function GamePage() {
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
    auth_status,
    groq_api_key,
    is_pro,
    setGameState,
    resetGame,
    fetchUserSaves,
    fetchSubscriptionStatus,
    createNewSaveSlot,
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
  const prevHpRef = useRef(player_status.hp);

  const [isShaking, setIsShaking] = useState(false);
  const [isDamageFlash, setIsDamageFlash] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpNum, setLevelUpNum] = useState(0);
  const prevLevelRef = useRef(player_status.level);
  const ambientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showJournal, setShowJournal] = useState(false);
  const [showDossier, setShowDossier] = useState(false);
  const [qteTimeLeft, setQteTimeLeft] = useState(0);
  const [worldLoading, setWorldLoading] = useState<{
    active: boolean;
    config: WorldConfig | null;
    prologue: string | null;
  }>({ active: false, config: null, prologue: null });

  // Refs for AI prefetch (pre-generate responses to suggested actions in background)
  const prefetchCacheRef = useRef<Map<string, unknown>>(new Map());
  const prefetchControllersRef = useRef<AbortController[]>([]);
  // Called once when the first AI turn completes (for world loading screen)
  const onFirstTurnCompleteRef = useRef<((prologue?: string) => void) | null>(null);
  // Tracks the last world event type fired — prevents the same type repeating back-to-back
  const lastWorldEventTypeRef = useRef<string | null>(null);
  const qteTriggeredRef = useRef(false);
  // Tracks whether the QTE timer has ticked at least once — prevents the auto-fire
  // effect from triggering immediately on activation when qteTimeLeft is still 0.
  const qteTimerTickedRef = useRef(false);
  const [showMobileStats, setShowMobileStats] = useState(false);
  const [lastStatChange, setLastStatChange] = useState<{ hp: number; mana: number } | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState(groq_api_key);
  const statChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Page transition state
  const displayedPhaseRef = useRef(game_phase);
  const [displayedPhase, setDisplayedPhase] = useState(game_phase);
  const [transOverlay, setTransOverlay] = useState(false);

  // กล่องแจ้งเตือน/ยืนยันแบบ modal (แทน window.alert / window.confirm)
  const [alertInfo, setAlertInfo] = useState<string | null>(null);
  const [confirmInfo, setConfirmInfo] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // คำนวณเปอร์เซ็นต์ HP (ถ้าต่ำกว่า 30% จะถือว่าปางตาย)
  const hpPercent =
    player_status.max_hp > 0
      ? (player_status.hp / player_status.max_hp) * 100
      : 100;

  const sceneImageUrl = useMemo(
    () => (current_image_prompt ? buildSceneImageUrl(current_image_prompt, world_config?.tone) : null),
    [current_image_prompt, world_config?.tone],
  );
  const isLowHp = hpPercent <= 30 && hpPercent > 0 && game_phase === "Playing";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, streamingNarrative]);

  // สั่นหน้าจอและ flash แดงเมื่อ HP ลดลง
  useEffect(() => {
    if (player_status.hp < prevHpRef.current) {
      setIsShaking(true);
      setIsDamageFlash(true);
      playDamage();
      const shakeTimer = setTimeout(() => setIsShaking(false), 400);
      const flashTimer = setTimeout(() => setIsDamageFlash(false), 350);
      prevHpRef.current = player_status.hp;
      return () => { clearTimeout(shakeTimer); clearTimeout(flashTimer); };
    }
    prevHpRef.current = player_status.hp;
  }, [player_status.hp]);

  // แสดง banner เมื่อ level ขึ้น
  useEffect(() => {
    if (player_status.level > prevLevelRef.current && prevLevelRef.current > 0) {
      setLevelUpNum(player_status.level);
      setShowLevelUp(true);
      playLevelUp();
      const timer = setTimeout(() => setShowLevelUp(false), 2200);
      prevLevelRef.current = player_status.level;
      return () => clearTimeout(timer);
    }
    prevLevelRef.current = player_status.level;
  }, [player_status.level]);

  // ตรวจสอบสถานะ login กับ Supabase ตอนเปิดแอป และติดตามการเปลี่ยนสถานะ
  // (login/logout) เพื่อสลับไปหน้า Dashboard/Auth ให้ถูกต้อง
  useEffect(() => {
    const supabase = getSupabaseClient();

    const applySession = (sessionUser: { id: string; email?: string } | null | undefined) => {
      if (sessionUser) {
        setGameState({
          user: { id: sessionUser.id, email: sessionUser.email ?? "" },
          auth_status: "authenticated",
        });
        fetchUserSaves(sessionUser.id);
        fetchSubscriptionStatus();
        if (useGameStore.getState().game_phase !== "Playing") {
          setGameState({ game_phase: "Dashboard" });
        }
      } else if (
        useGameStore.getState().auth_status !== "guest" &&
        useGameStore.getState().game_phase !== "Playing"
      ) {
        // ไม่ดีดผู้เล่นที่กำลังเล่นอยู่ออกจากเกม เผื่อ session หลุดชั่วคราว
        // ตอนสลับแท็บแล้ว Supabase auto-refresh ล้มเหลว (event นี้จะถูกยิงซ้ำได้)
        setGameState({ game_phase: "Auth" });
      }
    };

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      applySession(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        applySession(session?.user ?? null);
      },
    );

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // เริ่มจับเวลา QTE เมื่อ AI สั่งให้ active
  useEffect(() => {
    if (!is_qte_active) {
      qteTimerTickedRef.current = false;
      const t = setTimeout(() => setQteTimeLeft(0), 0);
      return () => clearTimeout(t);
    }
    playQteAlert();
    qteTriggeredRef.current = false;
    qteTimerTickedRef.current = false;
    const effectiveLimit = Math.max(qte_time_limit, 5);
    const startTime = Date.now();
    const interval = setInterval(() => {
      qteTimerTickedRef.current = true;
      const elapsed = (Date.now() - startTime) / 1000;
      setQteTimeLeft(Math.max(0, effectiveLimit - elapsed));
    }, 100);
    return () => clearInterval(interval);
  }, [is_qte_active, qte_time_limit]);

  const cancelPrefetches = () => {
    for (const ac of prefetchControllersRef.current) {
      try { ac.abort(); } catch {}
    }
    prefetchControllersRef.current = [];
  };

  // Apply parsed AI turn data: update game state, schedule ambient events,
  // sync to cloud, and kick off background prefetches for suggested actions.
  // Called from both runTurn (after streaming) and the prefetch cache path (instant).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyGameResult = (data: any, newHistory: ChatLog[], worldConfig: WorldConfig | null, message: string, isSystemInit: boolean) => {
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

    // Model sometimes decreases lives_left but forgets to reset hp/inventory.
    // Enforce the respawn contract client-side so the game state is always consistent.
    let playerStatus = { level: 1, exp: 0, skills: [], ...data.player_status };
    if (respawned) {
      playerStatus = { ...playerStatus, hp: playerStatus.max_hp, inventory: [] };
    }

    const updatedCharacters = { ...freshState.known_characters };
    if (Array.isArray(data.character_updates)) {
      for (const entry of data.character_updates) {
        if (entry?.name) updatedCharacters[entry.name] = entry;
      }
    }

    // Merge faction updates
    const updatedFactions = [...freshState.faction_standings];
    if (Array.isArray(data.faction_updates)) {
      for (const fu of data.faction_updates) {
        if (!fu?.name) continue;
        const idx = updatedFactions.findIndex((f) => f.name === fu.name);
        if (idx >= 0) updatedFactions[idx] = fu;
        else updatedFactions.push(fu);
      }
    }

    // Merge quest updates
    const updatedQuests = [...freshState.quest_log];
    if (Array.isArray(data.quest_updates)) {
      for (const qu of data.quest_updates) {
        if (!qu?.id) continue;
        const idx = updatedQuests.findIndex((q) => q.id === qu.id);
        if (idx >= 0) updatedQuests[idx] = qu;
        else updatedQuests.push(qu);
      }
    }

    // Merge companion updates
    const updatedCompanions = { ...freshState.companions };
    if (Array.isArray(data.companion_updates)) {
      for (const cu of data.companion_updates) {
        if (cu?.name) updatedCompanions[cu.name] = cu;
      }
    }

    // Append new locations (dedup by name)
    const existingNames = new Set(freshState.visited_locations.map((l) => l.name));
    const newLocs = Array.isArray(data.new_locations)
      ? data.new_locations.filter((l: { name: string }) => l?.name && !existingNames.has(l.name))
      : [];
    const updatedLocations = [...freshState.visited_locations, ...newLocs];

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

    // Signal world loading screen that the first turn is ready
    if (onFirstTurnCompleteRef.current) {
      onFirstTurnCompleteRef.current(data.prologue);
      onFirstTurnCompleteRef.current = null;
    }

    const isAmbientOrSystem = isWorldEventSignal(message) || message === QTE_TIMEOUT_SIGNAL;
    if (isWorldEventSignal(message)) playAmbient();

    // 25% chance of a typed ambient world event (skipped on system/QTE turns and after death)
    if (!isAmbientOrSystem && !isSystemInit && !data.is_dead && !data.is_qte_active && Math.random() < 0.25) {
      const delay = 6000 + Math.random() * 6000;
      ambientTimerRef.current = setTimeout(() => {
        const s = useGameStore.getState();
        if (!s.is_dead && !s.is_qte_active && s.game_phase === "Playing") {
          // Pick a type different from the last one to avoid back-to-back repetition
          const available = WORLD_EVENT_TYPES.filter((t) => t !== lastWorldEventTypeRef.current);
          const picked = available[Math.floor(Math.random() * available.length)];
          lastWorldEventTypeRef.current = picked;
          handleSendRef.current(buildWorldEventSignal(picked), true);
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

    // Pre-fetch suggested actions in background so the next player action can respond instantly
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
            let raw = "";
            let buf = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += dec.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() || "";
              for (const line of lines) {
                if (!line.trim()) continue;
                try { raw += (JSON.parse(line) as { response: string }).response; } catch {}
              }
            }
            if (buf.trim()) { try { raw += (JSON.parse(buf) as { response: string }).response; } catch {} }

            const r = extractAndParseJSON(raw);
            if (r.success) prefetchCacheRef.current.set(action, r.data);
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
      // อ่านค่าจาก store โดยตรง (ไม่ใช้ closure) เพื่อป้องกัน stale closure
      // กรณีที่ createNewSaveSlot reset store แล้วยังไม่ re-render ก่อน runTurn ถูกเรียก
      const freshState = useGameStore.getState();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      // เมื่อ API คืนค่า error จะได้ JSON { error: "..." } กลับมาแทน NDJSON stream ปกติ
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || `Request failed with status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rawAiResponse = "";
      let lineBuffer = "";
      let streamError: string | null = null;

      const processLine = (line: string) => {
        if (line.trim() === "") return;
        try {
          const parsed = JSON.parse(line);
          // Error จาก Groq ที่ซ่อนอยู่ใน stream body (rate limit, content filter ฯลฯ)
          if (typeof parsed.stream_error === "string") {
            streamError = parsed.stream_error;
            return;
          }
          // ป้องกัน "undefined" ติด string เมื่อ response field ไม่มีหรือไม่ใช่ string
          if (typeof parsed.response === "string") {
            rawAiResponse += parsed.response;
          }
          const narrativeMatch = /"narrative":\s*"([^"\\]*(?:\\.[^"\\]*)*)/.exec(rawAiResponse);
          if (narrativeMatch) {
            setStreamingNarrative(
              narrativeMatch[1].replaceAll("\\n", "\n").replaceAll('\\"', '"'),
            );
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

      const result = extractAndParseJSON(rawAiResponse);

      if (result.success) {
        applyGameResult(result.data, newHistory, worldConfig, message, isSystemInit);
      } else {
        setGameState({ is_qte_active: false, qte_time_limit: 0, qte_options: [] });
        setError("AI ตอบกลับมาผิดพลาด ไม่สามารถอ่านข้อมูลได้ ลองอีกครั้ง");
        setRetryAction({ newHistory, message, worldConfig });
        setStreamingNarrative("");
      }
    } catch (err) {
      console.error("Network Error:", err);
      const detail = err instanceof Error ? err.message : "";
      setGameState({ is_qte_active: false, qte_time_limit: 0, qte_options: [] });
      setError(
        detail
          ? `เชื่อมต่อกับ AI ไม่สำเร็จ: ${detail}`
          : "เชื่อมต่อกับ AI ไม่สำเร็จ กรุณาลองอีกครั้ง",
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

    // ยกเลิก ambient event ที่รออยู่เมื่อผู้เล่นส่ง action
    if (ambientTimerRef.current) {
      clearTimeout(ambientTimerRef.current);
      ambientTimerRef.current = null;
    }

    const worldConfig = worldConfigOverride || world_config;
    setInput("");

    const isNoResponse = message === "[ไม่ตอบสนอง]";
    const displayContent =
      message === QTE_TIMEOUT_SIGNAL ? getQteTimeoutDisplay(worldConfig?.language) : message;

    // ส่ง prompt ที่ descriptive กว่าให้ AI เพื่อไม่ให้สับสนและตอบ plain text แทน JSON
    const apiMessage = isNoResponse
      ? "[ไม่ตอบสนอง]: ผู้เล่นยืนนิ่งเงียบและไม่กระทำสิ่งใด เวลาผ่านไปเล็กน้อย กรุณาดำเนินเรื่องต่อโดยไม่มีการกระทำจากผู้เล่น"
      : message;

    const newHistory = isSystemInit
      ? useGameStore.getState().history
      : [...history, { role: "player" as const, content: displayContent }];
    if (!isSystemInit) setGameState({ history: newHistory });

    // Check prefetch cache for instant response on suggested actions
    const canUsePrefetch = !isSystemInit && !isNoResponse && message !== QTE_TIMEOUT_SIGNAL && !isWorldEventSignal(message);
    const cached = canUsePrefetch ? prefetchCacheRef.current.get(message) : null;
    cancelPrefetches();
    prefetchCacheRef.current.clear();

    if (cached) {
      applyGameResult(cached, newHistory, worldConfig, message, false);
      return;
    }

    await runTurn(newHistory, apiMessage, worldConfig, isSystemInit);
  };

  const handleRetry = () => {
    if (!retryAction) return;
    runTurn(retryAction.newHistory, retryAction.message, retryAction.worldConfig);
  };

  // เก็บ reference ล่าสุดของ handleSend ไว้ใช้ใน effect เพื่อไม่ให้ closure ค้างค่าเก่า
  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  useEffect(() => {
    return () => {
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
      if (statChangeTimerRef.current) clearTimeout(statChangeTimerRef.current);
      cancelPrefetches();
    };
  }, []);

  // หมดเวลา QTE -> ส่ง action "ยืนนิ่งไม่ทำอะไร" อัตโนมัติ
  useEffect(() => {
    if (is_qte_active && qteTimeLeft <= 0 && qte_time_limit > 0 && !isLoading && !qteTriggeredRef.current && qteTimerTickedRef.current) {
      qteTriggeredRef.current = true;
      playQteTimeout();
      handleSendRef.current(QTE_TIMEOUT_SIGNAL);
    }
  }, [qteTimeLeft, is_qte_active, qte_time_limit, isLoading]);

  // กด 1/2/3/4 เพื่อเลือก suggested action ทันที (เฉพาะตอนไม่มี QTE และไม่ loading)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (is_qte_active || isLoading || is_dead) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = Number.parseInt(e.key) - 1;
      if (idx >= 0 && idx < suggested_actions.length) {
        handleSendRef.current(suggested_actions[idx]);
      }
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [is_qte_active, isLoading, is_dead, suggested_actions]);

  // Animated transitions between Auth / Dashboard / Menu
  useEffect(() => {
    const isMenuP = (p: string) => p === "Auth" || p === "Dashboard" || p === "Menu";
    const prev = displayedPhaseRef.current;
    if (game_phase === prev) return;
    displayedPhaseRef.current = game_phase;

    if (isMenuP(game_phase) && isMenuP(prev)) {
      setTransOverlay(true);
      const t1 = setTimeout(() => setDisplayedPhase(game_phase), 220);
      const t2 = setTimeout(() => setTransOverlay(false), 520);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    setDisplayedPhase(game_phase);
  }, [game_phase]);

  const handleStartGame = async (config: WorldConfig) => {
    // Show loading screen immediately while AI generates the opening
    setGameState({
      world_config: config,
      game_phase: "Playing",
      history: [],
      lives_left: config.tone === "hardcore" ? 0 : 3,
    });
    setWorldLoading({ active: true, config, prologue: null });

    if (auth_status === "authenticated") {
      await createNewSaveSlot(config);
    }

    // When the first AI turn completes, hand the prologue to the loading screen
    onFirstTurnCompleteRef.current = (prologueText) => {
      setWorldLoading((prev) => ({ ...prev, prologue: prologueText ?? "" }));
    };

    handleSend("Begin the adventure.", true, config);
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim() || feedbackSubmitting) return;
    setFeedbackSubmitting(true);
    try {
      const saveSlotId = useGameStore.getState().current_save_slot_id;
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackText.trim(), saveSlotId }),
      });
      setFeedbackSent(true);
      setFeedbackText("");
      setTimeout(() => { setShowFeedback(false); setFeedbackSent(false); }, 2000);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

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
    window.location.reload();
  };

  const handleNewGame = () => {
    setConfirmInfo({
      message: "ต้องการเริ่มเกมใหม่และกลับไปหน้าสร้างโลกหรือไม่? ความคืบหน้าปัจจุบันจะหายไป",
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

    const blob = new Blob([JSON.stringify(saveData, null, 2)], {
      type: "application/json",
    });
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
      `  STORYWEAVE — บันทึกการเดินทาง`,
      `═══════════════════════════════════════`,
      `ตัวละคร : ${state.world_config?.character || "-"}`,
      `แนวเกม  : ${state.world_config?.genre || "-"}`,
      `โทน     : ${state.world_config?.tone || "-"}`,
      `ส่งออก  : ${new Date().toLocaleString("th-TH")}`,
      `═══════════════════════════════════════`,
      "",
    ];

    for (const entry of state.history) {
      if (entry.role === "player") {
        lines.push(`▶ ผู้เล่น: ${entry.content}`);
      } else {
        if (entry.prologue) {
          lines.push("", `[บทเปิดเรื่อง]`, entry.prologue, "");
        }
        lines.push(``, `📖 GM:`, entry.content, "");
      }
    }

    if (state.story_summary) {
      lines.push("═══════════════════════════════════════", "", "[สรุปเรื่องราว]", state.story_summary);
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
        if (typeof reader.result !== "string") {
          throw new TypeError("Invalid save file");
        }
        const data = JSON.parse(reader.result);
        if (!data.player_status || !data.world_config) {
          throw new Error("Invalid save file");
        }
        setGameState({
          player_status: {
            level: 1,
            exp: 0,
            skills: [],
            gold: 0,
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
      } catch (err) {
        console.error("Import Error:", err);
        setAlertInfo("ไฟล์เซฟไม่ถูกต้อง ไม่สามารถโหลดได้");
      }
    };
    reader.readAsText(file);
  };

  const renderScreen = () => {
    // World loading screen overlays everything when starting a new world
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

    if (displayedPhase === "Auth") {
      return (
        <div className="animate-[pageFadeIn_0.3s_ease-out_0.12s_both]">
          <AuthScreen />
        </div>
      );
    }

    if (displayedPhase === "Dashboard") {
      return (
        <div className="animate-[pageFadeIn_0.3s_ease-out_0.12s_both]">
          <MainMenuDashboard />
        </div>
      );
    }

    if (displayedPhase === "Menu") {
      return (
        <div className="animate-[pageFadeIn_0.3s_ease-out_0.12s_both]">
          <WorldCreationMenu
            onStart={handleStartGame}
            onCancel={auth_status === "authenticated" ? () => setGameState({ game_phase: "Dashboard" }) : undefined}
            isPro={is_pro}
          />
          {auth_status !== "authenticated" && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportSave}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                title="โหลดเกมจากไฟล์"
                className="fixed bottom-6 right-6 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50 rounded text-xs whitespace-nowrap transition-colors shadow-lg"
              >
                โหลดเกมจากไฟล์
              </button>
            </>
          )}
        </div>
      );
    }

    // Playing screen
    return (
      <div
        className={`relative flex h-screen bg-transparent text-amber-50 font-sans selection:bg-amber-800/60 transition-all duration-1000 ${isLowHp ? "shadow-[inset_0_0_150px_rgba(220,38,38,0.15)]" : ""} ${isShaking ? "animate-shake" : ""}`}
      >
        {sceneImageUrl && (
          <div
            className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
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

        {showLevelUp && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-level-up-pop">
            <div className="px-8 py-3 bg-amber-900/90 border border-amber-400/60 rounded-xl shadow-[0_0_30px_rgba(251,191,36,0.4)] text-center">
              <p className="text-xs text-amber-400/80 uppercase tracking-widest mb-0.5">Level Up!</p>
              <p className="text-2xl font-bold text-amber-300">Level {levelUpNum}</p>
            </div>
          </div>
        )}

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

        {/* z-10 wrapper ensures content sits above the fixed z-0 atmospheric background */}
        <div className="relative z-10 flex flex-1 min-w-0">
          <div className="flex-1 flex flex-col min-w-0 max-w-5xl mx-auto border-x border-amber-900/20 bg-stone-950/60 shadow-[inset_0_0_120px_rgba(0,0,0,0.4)]">
            <GameHeader
              worldConfig={world_config}
              isLowHp={isLowHp}
              authStatus={auth_status}
              hasPersonalKey={!!groq_api_key}
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
              onOpenSettings={() => { setApiKeyDraft(groq_api_key); setShowSettings(true); }}
            />

            {/* Persistent scene image — shows current location/scene, updates every time scene changes */}
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
            hpPercent={hpPercent}
            isLowHp={isLowHp}
            livesLeft={lives_left}
            companions={companions}
            factionStandings={faction_standings}
            openThreads={open_threads}
          />
        </div>

        {/* Mobile stats FAB — visible only on small screens */}
        <button
          type="button"
          onClick={() => setShowMobileStats(true)}
          aria-label="เปิดสถานะตัวละคร"
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

        {/* Feedback button */}
        <button
          type="button"
          onClick={() => setShowFeedback(true)}
          className="fixed bottom-6 left-6 z-30 flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/80 hover:bg-stone-800/90 text-neutral-500 hover:text-amber-300 border border-neutral-700/40 hover:border-amber-800/50 rounded-full text-xs transition-all shadow-lg backdrop-blur hover:-translate-y-0.5"
        >
          <MessageSquare size={12} /> Feedback
        </button>

        {/* Settings modal */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="text-amber-300 font-semibold text-sm uppercase tracking-widest">API Key ของคุณ</h2>
                {groq_api_key ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ใช้ Key ส่วนตัว
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/50 border border-amber-800/40 rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> ใช้ Key ส่วนกลาง
                  </span>
                )}
              </div>

              {/* Policy explanation */}
              <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-lg p-4 flex flex-col gap-3 text-xs text-neutral-400 leading-relaxed">
                <div className="flex gap-3">
                  <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
                  <div>
                    <p className="text-neutral-300 font-medium mb-1">Key ส่วนกลาง — จำกัด 50 เทิร์น/วัน ต่อ IP</p>
                    <p>เราแชร์ API Key ของเราให้ทุกคนใช้ร่วมกัน แต่มีโควต้าจำกัด 50 เทิร์น/วันต่อ IP Address เพื่อป้องกันไม่ให้ค่าใช้จ่ายบานปลาย โควต้ารีเซตทุกเที่ยงคืน UTC (07:00 น. ตามเวลาไทย)</p>
                  </div>
                </div>
                <div className="border-t border-neutral-700/50" />
                <div className="flex gap-3">
                  <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                  <div>
                    <p className="text-neutral-300 font-medium mb-1">Key ส่วนตัว — ไม่มีจำกัดจากเรา</p>
                    <p>ถ้ามี Groq API Key ของตัวเอง จะไม่มีการจำกัดเทิร์นจากฝั่งเรา ขึ้นอยู่กับโควต้า Groq ของคุณเอง (Groq มีระดับฟรีให้ใช้งาน) Key ของคุณ<span className="text-neutral-200"> ถูกส่งไปยัง Server เฉพาะตอนเล่นเกม</span> — ไม่ถูกบันทึกหรือเก็บไว้ที่เซิร์ฟเวอร์ของเรา และจะหายไปเมื่อปิด Tab</p>
                  </div>
                </div>
              </div>

              {/* Key input */}
              <div className="flex flex-col gap-2">
                <label htmlFor="groq-key-input" className="text-xs text-neutral-400 font-medium">
                  ใส่ Groq API Key ของคุณ
                </label>
                <input
                  id="groq-key-input"
                  type="password"
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-700/60 font-mono"
                  placeholder="gsk_..."
                  value={apiKeyDraft}
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-neutral-600">
                  สร้าง Key ฟรีได้ที่{" "}
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-400 underline underline-offset-2 transition-colors"
                  >
                    console.groq.com/keys
                  </a>
                  {" "}— สมัครฟรี ไม่ต้องใส่บัตรเครดิต
                </p>
              </div>

              <div className="flex gap-2 justify-between items-center">
                {groq_api_key && (
                  <button
                    type="button"
                    onClick={() => { setApiKeyDraft(""); setGameState({ groq_api_key: "" }); setShowSettings(false); }}
                    className="px-3 py-2 text-xs text-red-400/70 hover:text-red-300 transition-colors"
                  >
                    ลบ Key ออก
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => { setGameState({ groq_api_key: apiKeyDraft.trim() }); setShowSettings(false); }}
                    className="px-4 py-2 text-xs bg-amber-800/70 hover:bg-amber-700/70 text-amber-200 rounded-lg transition-colors"
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback modal */}
        {showFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6 flex flex-col gap-4">
              <h2 className="text-amber-300 font-semibold text-sm uppercase tracking-widest">ส่ง Feedback</h2>
              {feedbackSent ? (
                <p className="text-emerald-400 text-sm text-center py-4">ขอบคุณสำหรับ feedback ครับ!</p>
              ) : (
                <>
                  <textarea
                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg p-3 text-sm text-neutral-200 placeholder-neutral-500 resize-none focus:outline-none focus:border-amber-700/60"
                    rows={5}
                    placeholder="แจ้งปัญหา, เสนอแนะ, หรือบอกว่าชอบอะไร..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    maxLength={2000}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setShowFeedback(false); setFeedbackText(""); }}
                      className="px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={submitFeedback}
                      disabled={feedbackSubmitting || feedbackText.trim().length < 5}
                      className="px-4 py-2 text-xs bg-amber-800/70 hover:bg-amber-700/70 disabled:opacity-40 text-amber-200 rounded-lg transition-colors"
                    >
                      {feedbackSubmitting ? "กำลังส่ง..." : "ส่ง"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {renderScreen()}

      {/* Shared modals — rendered outside renderScreen so they persist across transitions */}
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
          title="เริ่มเกมใหม่?"
          message={confirmInfo.message}
          confirmText="เริ่มใหม่"
          cancelText="ยกเลิก"
          onConfirm={confirmInfo.onConfirm}
          onCancel={() => setConfirmInfo(null)}
        />
      )}

      {/* Page transition overlay — flashes to black between menu screens */}
      {transOverlay && (
        <div className="fixed inset-0 z-[200] pointer-events-none bg-neutral-950 animate-[pageTransition_0.52s_ease-in-out_forwards]" />
      )}
    </>
  );
}
