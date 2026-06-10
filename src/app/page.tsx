"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore, WorldConfig, ChatLog } from "@/store/useGameStore";
import WorldCreationMenu from "@/components/WorldCreationMenu";

// 1. ฟังก์ชันสกัด JSON
function extractAndParseJSON(rawAiResponse: string) {
  try {
    const startIndex = rawAiResponse.indexOf("{");
    const endIndex = rawAiResponse.lastIndexOf("}");
    if (startIndex === -1 || endIndex === -1)
      throw new Error("No JSON object found.");

    const jsonString = rawAiResponse.substring(startIndex, endIndex + 1);
    return { success: true, data: JSON.parse(jsonString) };
  } catch (error) {
    console.error("Parse Error:", error);
    return { success: false, rawData: rawAiResponse };
  }
}

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
    setGameState,
    resetGame,
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

  // คำนวณเปอร์เซ็นต์ HP (ถ้าต่ำกว่า 30% จะถือว่าปางตาย)
  const hpPercent =
    player_status.max_hp > 0
      ? (player_status.hp / player_status.max_hp) * 100
      : 100;
  const isLowHp = hpPercent <= 30 && hpPercent > 0 && game_phase === "Playing";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, streamingNarrative, current_image_prompt]);

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
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rawAiResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            rawAiResponse += parsed.response;

            const narrativeMatch = rawAiResponse.match(
              /"narrative":\s*"([^"\\]*(?:\\.[^"\\]*)*)/,
            );
            if (narrativeMatch) {
              setStreamingNarrative(
                narrativeMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
              );
            }
          } catch (e) {}
        }
      }

      const result = extractAndParseJSON(rawAiResponse);

      if (result.success) {
        const data = result.data;

        setGameState({
          player_status: data.player_status,
          story_summary: data.story_summary,
          current_objective: data.current_objective || "",
          is_dead: !!data.is_dead,
          current_image_prompt: data.scene_image_prompt || "",
          suggested_actions: Array.isArray(data.suggested_actions) ? data.suggested_actions : [],
          history: [
            ...newHistory,
            { role: "gm", content: data.narrative },
          ],
        });
        setStreamingNarrative("");
        setRetryAction(null);
      } else {
        setError("AI ตอบกลับมาผิดพลาด ไม่สามารถอ่านข้อมูลได้ ลองอีกครั้ง");
        setRetryAction({ newHistory, message, worldConfig });
        setStreamingNarrative("");
      }
    } catch (err) {
      console.error("Network Error:", err);
      setError("เชื่อมต่อกับ AI ไม่สำเร็จ ตรวจสอบว่า Ollama กำลังทำงานอยู่ แล้วลองอีกครั้ง");
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

    const worldConfig = worldConfigOverride || world_config;

    setInput("");

    const newHistory = isSystemInit
      ? history
      : [...history, { role: "player" as const, content: message }];
    if (!isSystemInit) setGameState({ history: newHistory });

    await runTurn(newHistory, message, worldConfig);
  };

  const handleRetry = () => {
    if (!retryAction) return;
    runTurn(retryAction.newHistory, retryAction.message, retryAction.worldConfig);
  };

  const handleStartGame = (config: WorldConfig) => {
    setGameState({ world_config: config, game_phase: "Playing", history: [] });
    handleSend("Begin the adventure.", true, config);
  };

  const handleRestart = () => {
    resetGame();
    useGameStore.persist.clearStorage();
    window.location.reload();
  };

  const handleNewGame = () => {
    if (globalThis.confirm("ต้องการเริ่มเกมใหม่และกลับไปหน้าสร้างโลกหรือไม่? ความคืบหน้าปัจจุบันจะหายไป")) {
      handleRestart();
    }
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
        const data = JSON.parse(reader.result as string);
        if (!data.player_status || !data.world_config) {
          throw new Error("Invalid save file");
        }
        setGameState({
          player_status: data.player_status,
          is_dead: !!data.is_dead,
          game_phase: "Playing",
          history: Array.isArray(data.history) ? data.history : [],
          story_summary: data.story_summary || "",
          current_image_prompt: data.current_image_prompt || "",
          suggested_actions: Array.isArray(data.suggested_actions) ? data.suggested_actions : [],
          current_objective: data.current_objective || "",
          world_config: data.world_config,
        });
        setError(null);
      } catch (err) {
        console.error("Import Error:", err);
        globalThis.alert("ไฟล์เซฟไม่ถูกต้อง ไม่สามารถโหลดได้");
      }
    };
    reader.readAsText(file);
  };

  if (game_phase === "Menu") {
    return (
      <>
        <WorldCreationMenu onStart={handleStartGame} />
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
    );
  }

  return (
    <div
      className={`relative flex h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-neutral-700 transition-all duration-1000 ${isLowHp ? "shadow-[inset_0_0_150px_rgba(220,38,38,0.15)]" : ""}`}
    >
      <div className="flex-1 flex flex-col justify-between max-w-5xl mx-auto border-x border-neutral-800 bg-neutral-900/30">
        <header
          className={`p-4 border-b border-neutral-800 backdrop-blur transition-colors duration-500 ${isLowHp ? "bg-red-950/40" : "bg-neutral-950/80"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-white tracking-widest">
                AI REALM
              </h1>
              <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
                Language: {world_config?.language} | Tone: {world_config?.tone}{" "}
                {isLowHp && (
                  <span className="text-red-500 ml-2 font-bold animate-pulse">
                    ⚠️ LOW HP WARNING
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportSave}
                title="บันทึกเกมเป็นไฟล์"
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50 rounded text-xs whitespace-nowrap transition-colors"
              >
                บันทึกเกม
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                title="โหลดเกมจากไฟล์"
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50 rounded text-xs whitespace-nowrap transition-colors"
              >
                โหลดเกม
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportSave}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleNewGame}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50 rounded text-xs whitespace-nowrap transition-colors"
              >
                เมนูหลัก
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">

          {/* --- ระบบภาพประกอบฉาก แทรกไว้บนสุดของช่องแชท --- */}
          {current_image_prompt && (
            <div className="w-full h-64 md:h-80 rounded-xl overflow-hidden border border-neutral-700 relative shadow-2xl mb-8 group shrink-0">
              <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center">
                <span className="text-neutral-600 text-sm">กำลังวาดภาพนิมิต...</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://image.pollinations.ai/prompt/${encodeURIComponent(current_image_prompt + ', dark fantasy RPG style, masterpiece, highly detailed, cinematic lighting')}?width=1024&height=512&nologo=true`}
                alt="Scene"
                className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-1000"
                onError={(e) => e.currentTarget.style.display = 'none'}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-20">
                <p className="text-xs text-neutral-400 font-mono truncate opacity-0 group-hover:opacity-100 transition-opacity">VISION: {current_image_prompt}</p>
              </div>
            </div>
          )}
          {/* ------------------------------------------- */}

          {history.length > 0 ? (
            history.map((chat, index) => (
              <div
                key={index}
                className={`flex ${chat.role === "player" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-5 py-4 ${
                    chat.role === "player"
                      ? "bg-neutral-800 border border-neutral-700 text-neutral-300"
                      : "prose prose-invert prose-p:leading-relaxed text-neutral-200"
                  }`}
                >
                  {chat.role === "player" && (
                    <div className="text-xs text-neutral-500 mb-2 uppercase tracking-wider font-bold">
                      You
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{chat.content}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-600 animate-pulse">
              กำลังเชื่อมต่อจิตวิญญาณ...
            </div>
          )}

          {streamingNarrative && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg px-5 py-4 prose prose-invert prose-p:leading-relaxed text-neutral-200 border border-neutral-800 bg-neutral-950/50 shadow-lg">
                <div className="text-xs text-blue-400 mb-2 uppercase tracking-wider font-bold animate-pulse">
                  GM Is Typing...
                </div>
                <div className="whitespace-pre-wrap">{streamingNarrative}</div>
              </div>
            </div>
          )}

          {isLoading && !streamingNarrative && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg px-5 py-4 text-neutral-500 italic animate-pulse border border-transparent">
                GM กำลังคำนวณผลลัพธ์และทอยเต๋าโชคชะตา...
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="p-4 md:p-6 border-t border-neutral-800 bg-neutral-950 flex flex-col gap-3">
          {error && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-950/40 border border-red-800/50 rounded text-sm text-red-300">
              <span>⚠️ {error}</span>
              <button
                onClick={handleRetry}
                disabled={isLoading}
                className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 border border-red-700 rounded text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-50"
              >
                {isLoading ? "..." : "ลองอีกครั้ง"}
              </button>
            </div>
          )}
          {is_dead ? (
            <button
              onClick={handleRestart}
              className="w-full py-4 bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-700 font-bold rounded tracking-widest transition-colors shadow-[0_0_30px_rgba(220,38,38,0.5)]"
            >
              คุณเสียชีวิตแล้ว - จุติใหม่
            </button>
          ) : (
            <>
              {suggested_actions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggested_actions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(action)}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 rounded border border-neutral-700/50 text-xs transition-colors disabled:opacity-50"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(input);
                }}
                className="flex gap-3 mt-1"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  placeholder={
                    isLoading
                      ? "GM กำลังประมวลผล..."
                      : "พิมพ์สิ่งที่คุณต้องการทำ..."
                  }
                  className={`flex-1 bg-neutral-900 border ${isLowHp ? "border-red-900/50 focus:border-red-500" : "border-neutral-700 focus:border-neutral-400"} rounded px-4 py-3 focus:outline-none disabled:opacity-50 transition-colors`}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-neutral-300 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "..." : "ส่ง"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div
        className={`w-80 bg-neutral-950 p-6 overflow-y-auto flex flex-col gap-8 border-l transition-colors duration-500 ${isLowHp ? "border-red-900/30" : "border-neutral-800"}`}
      >
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2">
            Character
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {world_config?.character || "ไม่มีข้อมูลตัวละคร"}
          </p>
          <p className="text-xs text-neutral-600 leading-relaxed">
            {world_config?.genre}
          </p>
        </div>

        {current_objective && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2">
              Objective
            </h2>
            <p className="text-sm text-amber-300/90 leading-relaxed">
              🎯 {current_objective}
            </p>
          </div>
        )}

        <div className="space-y-5">
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2">
            Vitals
          </h2>
          <div>
            <div className="flex justify-between text-sm mb-1 font-medium">
              <span className="text-red-400">HP</span>
              <span>
                {player_status.hp} / {player_status.max_hp}
              </span>
            </div>
            <div
              className={`w-full bg-neutral-900 rounded-full h-2.5 border ${isLowHp ? "border-red-800/50" : "border-neutral-800"}`}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${isLowHp ? "bg-red-600 animate-pulse" : "bg-red-500"}`}
                style={{ width: `${hpPercent}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1 font-medium">
              <span className="text-blue-400">Mana</span>
              <span>
                {player_status.mana} / {player_status.max_mana}
              </span>
            </div>
            <div className="w-full bg-neutral-900 rounded-full h-2.5 border border-neutral-800">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${player_status.max_mana > 0 ? (player_status.mana / player_status.max_mana) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 mb-3">
            Conditions
          </h2>
          <div className="flex flex-wrap gap-2">
            {player_status.status_effects.length > 0 ? (
              player_status.status_effects.map((effect, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 text-xs bg-yellow-900/30 border rounded ${effect.includes("บาดแผล") || effect.includes("เลือด") || effect.includes("ไหม้") ? "text-red-400 border-red-700/50" : "text-yellow-500 border-yellow-700/50"}`}
                >
                  {effect}
                </span>
              ))
            ) : (
              <span className="text-sm text-neutral-600 italic">
                ร่างกายปกติ
              </span>
            )}
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 mb-3">
            Inventory
          </h2>
          <ul className="space-y-2">
            {player_status.inventory.length > 0 ? (
              player_status.inventory.map((item, i) => (
                <li
                  key={i}
                  className="text-sm bg-neutral-900/50 px-3 py-2 border border-neutral-800 rounded text-neutral-300"
                >
                  {item}
                </li>
              ))
            ) : (
              <li className="text-sm text-neutral-600 italic">
                กระเป๋าว่างเปล่า
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
