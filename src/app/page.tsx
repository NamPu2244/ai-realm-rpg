"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore, WorldConfig, ChatLog } from "@/store/useGameStore";
import WorldCreationMenu from "@/components/WorldCreationMenu";
import AuthScreen from "@/components/AuthScreen";
import MainMenuDashboard from "@/components/MainMenuDashboard";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { AlertModal, ConfirmModal } from "@/components/ui/Modal";
import JournalModal from "@/components/game/JournalModal";
import QTEOverlay from "@/components/game/QTEOverlay";
import ChatHistory from "@/components/game/ChatHistory";
import GameHeader from "@/components/game/GameHeader";
import ActionBar from "@/components/game/ActionBar";
import CharacterSidebar from "@/components/game/CharacterSidebar";
import {
  extractAndParseJSON,
  QTE_TIMEOUT_SIGNAL,
  WORLD_EVENT_SIGNAL,
  getQteTimeoutDisplay,
  buildSceneImageUrl,
} from "@/lib/gameText";

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
    auth_status,
    current_save_slot_id,
    setGameState,
    resetGame,
    fetchUserSaves,
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
  const [showTransition, setShowTransition] = useState(false);
  const [qteTimeLeft, setQteTimeLeft] = useState(0);
  const qteTriggeredRef = useRef(false);

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
  const isLowHp = hpPercent <= 30 && hpPercent > 0 && game_phase === "Playing";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, streamingNarrative, current_image_prompt]);

  // สั่นหน้าจอและ flash แดงเมื่อ HP ลดลง
  useEffect(() => {
    if (player_status.hp < prevHpRef.current) {
      setIsShaking(true);
      setIsDamageFlash(true);
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

  // ปิดฉาก Cinematic Transition หลังจากเข้าสู่เกม
  useEffect(() => {
    if (showTransition) {
      const timer = setTimeout(() => setShowTransition(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [showTransition]);

  // เริ่มจับเวลา QTE เมื่อ AI สั่งให้ active
  useEffect(() => {
    if (!is_qte_active) {
      const t = setTimeout(() => setQteTimeLeft(0), 0);
      return () => clearTimeout(t);
    }
    qteTriggeredRef.current = false;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      setQteTimeLeft(Math.max(0, qte_time_limit - elapsed));
    };
    const interval = setInterval(tick, 100);
    const initial = setTimeout(tick, 0);
    return () => {
      clearInterval(interval);
      clearTimeout(initial);
    };
  }, [is_qte_active, qte_time_limit]);

  const runTurn = async (
    newHistory: ChatLog[],
    message: string,
    worldConfig: WorldConfig | null,
  ) => {
    setIsLoading(true);
    setStreamingNarrative("");
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: message,
          history: newHistory.slice(-10),
          currentState: player_status,
          currentSummary: story_summary,
          worldConfig,
          livesLeft: lives_left,
          saveSlotId: current_save_slot_id ?? undefined,
        }),
      });

      if (!res.body) throw new Error("No response body");

      // เมื่อ API คืนค่า error (เช่น Ollama/Groq ตอบผิดพลาด หรือ request ไม่ผ่าน validation)
      // จะได้ JSON { error: "..." } กลับมาแทน NDJSON stream ปกติ ให้แสดงข้อความนั้นตรงๆ
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || `Request failed with status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rawAiResponse = "";
      // เก็บส่วนท้ายของ chunk ที่ยังไม่ครบหนึ่งบรรทัด NDJSON ไว้ต่อกับ chunk ถัดไป
      // ป้องกันไม่ให้ JSON.parse ล้มเหลวและบรรทัดนั้นหายไปเงียบๆ
      let lineBuffer = "";

      const processLine = (line: string) => {
        if (line.trim() === "") return;
        try {
          const parsed = JSON.parse(line);
          rawAiResponse += parsed.response;

          const narrativeMatch = /"narrative":\s*"([^"\\]*(?:\\.[^"\\]*)*)/.exec(
            rawAiResponse,
          );
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

        for (const line of lines) {
          processLine(line);
        }
      }

      processLine(lineBuffer);

      const result = extractAndParseJSON(rawAiResponse);

      if (result.success) {
        const data = result.data;

        setGameState({
          player_status: {
            level: 1,
            exp: 0,
            skills: [],
            ...data.player_status,
          },
          story_summary: data.story_summary,
          current_objective: data.current_objective || "",
          is_dead: !!data.is_dead,
          current_image_prompt: data.scene_image_prompt || current_image_prompt,
          suggested_actions: Array.isArray(data.suggested_actions) ? data.suggested_actions : [],
          is_qte_active: !!data.is_qte_active,
          qte_time_limit: typeof data.qte_time_limit === "number" ? data.qte_time_limit : 0,
          qte_options: Array.isArray(data.qte_options) ? data.qte_options : [],
          lives_left: typeof data.lives_left === "number" ? data.lives_left : lives_left,
          history: [
            ...newHistory,
            {
              role: "gm",
              content: data.narrative,
              ...(data.prologue ? { prologue: data.prologue } : {}),
              ...(data.scene_image_prompt ? { scene_image_prompt: data.scene_image_prompt } : {}),
            },
          ],
        });
        setStreamingNarrative("");
        setRetryAction(null);

        // 25% chance ที่โลกจะส่ง ambient event เอง (ไม่ fire ถ้าเป็น ambient/QTE turn เอง หรือตายแล้ว)
        const isAmbientOrSystem = message === WORLD_EVENT_SIGNAL || message === QTE_TIMEOUT_SIGNAL;
        if (!isAmbientOrSystem && !data.is_dead && !data.is_qte_active && Math.random() < 0.25) {
          const delay = 6000 + Math.random() * 6000; // 6-12 วินาที
          ambientTimerRef.current = setTimeout(() => {
            const s = useGameStore.getState();
            if (!s.is_dead && !s.is_qte_active && s.game_phase === "Playing") {
              handleSendRef.current(WORLD_EVENT_SIGNAL, true);
            }
          }, delay);
        }

        if (useGameStore.getState().auth_status === "authenticated") {
          syncCurrentGameToCloud();

          // Every 10 GM turns, distil recent events into a searchable memory.
          // Fire-and-forget: don't await so it never blocks the UI.
          const slotId = useGameStore.getState().current_save_slot_id;
          const fullHistory = [...newHistory, { role: "gm" as const, content: data.narrative }];
          const gmCount = fullHistory.filter((h) => h.role === "gm").length;
          if (slotId && gmCount > 0 && gmCount % 10 === 0) {
            fetch("/api/memories", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                saveSlotId: slotId,
                recentHistory: fullHistory.slice(-20),
              }),
            }).catch((err) => console.warn("[memories] background trigger failed:", err));
          }
        }
      } else {
        setError("AI ตอบกลับมาผิดพลาด ไม่สามารถอ่านข้อมูลได้ ลองอีกครั้ง");
        setRetryAction({ newHistory, message, worldConfig });
        setStreamingNarrative("");
      }
    } catch (err) {
      console.error("Network Error:", err);
      const detail = err instanceof Error ? err.message : "";
      setError(
        detail
          ? `เชื่อมต่อกับ AI ไม่สำเร็จ: ${detail}`
          : "เชื่อมต่อกับ AI ไม่สำเร็จ ตรวจสอบว่า Ollama กำลังทำงานอยู่ แล้วลองอีกครั้ง",
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

    const displayContent =
      message === QTE_TIMEOUT_SIGNAL ? getQteTimeoutDisplay(worldConfig?.language) : message;

    const newHistory = isSystemInit
      ? history
      : [...history, { role: "player" as const, content: displayContent }];
    if (!isSystemInit) setGameState({ history: newHistory });

    await runTurn(newHistory, message, worldConfig);
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
    };
  }, []);

  // หมดเวลา QTE -> ส่ง action "ยืนนิ่งไม่ทำอะไร" อัตโนมัติ
  useEffect(() => {
    if (is_qte_active && qteTimeLeft <= 0 && qte_time_limit > 0 && !isLoading && !qteTriggeredRef.current) {
      qteTriggeredRef.current = true;
      handleSendRef.current(QTE_TIMEOUT_SIGNAL);
    }
  }, [qteTimeLeft, is_qte_active, qte_time_limit, isLoading]);

  const handleStartGame = async (config: WorldConfig) => {
    if (auth_status === "authenticated") {
      await createNewSaveSlot(config);
    } else {
      setGameState({ world_config: config, game_phase: "Playing", history: [] });
    }
    setShowTransition(true);
    handleSend("Begin the adventure.", true, config);
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
    };

    const blob = new Blob([JSON.stringify(saveData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `ai-realm-save-${timestamp}.json`;
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
        });
        setError(null);
      } catch (err) {
        console.error("Import Error:", err);
        setAlertInfo("ไฟล์เซฟไม่ถูกต้อง ไม่สามารถโหลดได้");
      }
    };
    reader.readAsText(file);
  };

  if (game_phase === "Auth") {
    return <AuthScreen />;
  }

  if (game_phase === "Dashboard") {
    return <MainMenuDashboard />;
  }

  if (game_phase === "Menu") {
    return (
      <>
        <WorldCreationMenu
          onStart={handleStartGame}
          onCancel={auth_status === "authenticated" ? () => setGameState({ game_phase: "Dashboard" }) : undefined}
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
        {alertInfo && (
          <AlertModal
            variant="danger"
            message={alertInfo}
            onClose={() => setAlertInfo(null)}
          />
        )}
      </>
    );
  }

  return (
    <div
      className={`relative flex h-screen bg-transparent text-amber-50 font-sans selection:bg-amber-800/60 transition-all duration-1000 ${isLowHp ? "shadow-[inset_0_0_150px_rgba(220,38,38,0.15)]" : ""} ${isShaking ? "animate-shake" : ""}`}
    >
      {current_image_prompt && (
        <div
          className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="absolute inset-0 scale-110"
            style={{
              backgroundImage: `url(${buildSceneImageUrl(current_image_prompt)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(48px) brightness(0.12) saturate(0.8)",
            }}
          />
        </div>
      )}

      {showTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black animate-fade-out-cinematic pointer-events-none">
          <p className="text-amber-400/80 text-sm tracking-[0.3em] uppercase animate-pulse">
            การเดินทางเริ่มต้นขึ้น...
          </p>
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
          onSelect={(option) => handleSend(option)}
        />
      )}

      {showJournal && (
        <JournalModal
          currentObjective={current_objective}
          storySummary={story_summary}
          worldConfig={world_config}
          onClose={() => setShowJournal(false)}
        />
      )}

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

      {/* z-10 wrapper ensures content sits above the fixed z-0 atmospheric background */}
      <div className="relative z-10 flex flex-1 min-w-0">
        <div className="flex-1 flex flex-col min-w-0 max-w-5xl mx-auto border-x border-amber-900/20 bg-stone-950/60 shadow-[inset_0_0_120px_rgba(0,0,0,0.4)]">
          <GameHeader
            worldConfig={world_config}
            isLowHp={isLowHp}
            authStatus={auth_status}
            importInputRef={importInputRef}
            onOpenJournal={() => setShowJournal(true)}
            onExportSave={handleExportSave}
            onImportSave={handleImportSave}
            onQuitToDashboard={() => quitToMainMenu()}
            onNewGame={handleNewGame}
          />

          {/* Persistent scene image — shows current location/scene, updates every time scene changes */}
          {current_image_prompt && (
            <div className="relative shrink-0 overflow-hidden border-b border-amber-900/20" style={{ height: "200px" }}>
              <img
                key={current_image_prompt}
                src={buildSceneImageUrl(current_image_prompt)}
                alt=""
                className="w-full h-full object-cover animate-narrative-in"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/10 to-transparent" />
            </div>
          )}

          <ChatHistory
            history={history}
            streamingNarrative={streamingNarrative}
            isLoading={isLoading}
            chatEndRef={chatEndRef}
          />

          <ActionBar
            error={error}
            isLoading={isLoading}
            isDead={is_dead}
            suggestedActions={suggested_actions}
            input={input}
            isLowHp={isLowHp}
            onInputChange={setInput}
            onSend={(message) => handleSend(message)}
            onSubmit={() => handleSend(input)}
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
        />
      </div>
    </div>
  );
}
