"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";

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
    current_language,
    history,
    story_summary, // <--- ดึงค่านี้เพิ่ม
    setGameState,
    resetGame,
  } = useGameStore();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingNarrative, setStreamingNarrative] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // คำนวณเปอร์เซ็นต์ HP (ถ้าต่ำกว่า 30% จะถือว่าปางตาย)
  const hpPercent =
    player_status.max_hp > 0
      ? (player_status.hp / player_status.max_hp) * 100
      : 100;
  const isLowHp = hpPercent <= 30 && hpPercent > 0 && game_phase === "Playing";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, streamingNarrative]);

  const handleSend = async (message: string, isSystemInit = false) => {
    if (!message.trim() && !isSystemInit) return;

    setIsLoading(true);
    setInput("");
    setStreamingNarrative("");

    const newHistory = isSystemInit
      ? history
      : [...history, { role: "player" as const, content: message }];
    if (!isSystemInit) setGameState({ history: newHistory });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: message,
          history: newHistory.slice(-10), // ยังคงส่งแค่ 10 เทิร์นล่าสุดเพื่อประหยัด Token
          currentState: player_status,
          currentSummary: story_summary, // <--- ส่งความจำที่บีบอัดแล้วไปให้ AI
          gamePhase: game_phase, // <--- บอก AI ว่าตอนนี้อยู่เฟสไหน กันลูป
          currentLanguage: current_language, // <--- บอก AI ว่าตอนนี้ใช้ภาษาอะไร
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

        // โมเดลขนาดเล็กมักลืมอัปเดต game_phase/current_language ตอนเปลี่ยนภาษา
        // เราจึงบังคับ override ตรงนี้ เพราะฝั่ง client รู้ภาษาที่เลือกอยู่แล้ว
        if (game_phase === "Language_Selection" && current_language === "Pending" && !isSystemInit) {
          data.current_language = message;
          data.game_phase = "Setup";
        }

        setGameState({
          ...data,
          history: [
            ...newHistory,
            { role: "gm", content: data.narrative },
          ],
        });
      } else {
        alert("AI ตอบกลับมาผิดพลาด");
      }

      setStreamingNarrative("");
    } catch (error) {
      console.error("Network Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (history.length === 0 && current_language === "Pending") {
      handleSend("Start Phase 0", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestart = () => {
    resetGame();
    useGameStore.persist.clearStorage();
    window.location.reload();
  };

  return (
    <div
      className={`relative flex h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-neutral-700 transition-all duration-1000 ${isLowHp ? "shadow-[inset_0_0_150px_rgba(220,38,38,0.15)]" : ""}`}
    >
      <div className="flex-1 flex flex-col justify-between max-w-5xl mx-auto border-x border-neutral-800 bg-neutral-900/30">
        <header
          className={`p-4 border-b border-neutral-800 backdrop-blur transition-colors duration-500 ${isLowHp ? "bg-red-950/40" : "bg-neutral-950/80"}`}
        >
          <h1 className="text-xl font-bold text-white tracking-widest">
            AI REALM
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
            Status: {game_phase} | Language: {current_language}{" "}
            {isLowHp && (
              <span className="text-red-500 ml-2 font-bold animate-pulse">
                ⚠️ LOW HP WARNING
              </span>
            )}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
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

          {/* ข้อความแสดงตอน GM กำลังสตรีมเนื้อเรื่อง */}
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

          {/* ข้อความแสดงตอนที่ GM กำลังคำนวณและทอยเต๋า (ก่อนสตรีมจะเริ่ม) */}
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
          {is_dead ? (
            <button
              onClick={handleRestart}
              className="w-full py-4 bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-700 font-bold rounded tracking-widest transition-colors shadow-[0_0_30px_rgba(220,38,38,0.5)]"
            >
              คุณเสียชีวิตแล้ว - จุติใหม่
            </button>
          ) : (
            <>
              {game_phase === "Language_Selection" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSend("ภาษาไทย")}
                    disabled={isLoading}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 text-sm transition-colors"
                  >
                    🇹🇭 ภาษาไทย
                  </button>
                  <button
                    onClick={() => handleSend("English")}
                    disabled={isLoading}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 text-sm transition-colors"
                  >
                    🇬🇧 English
                  </button>
                  <button
                    onClick={() => handleSend("日本語")}
                    disabled={isLoading}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 text-sm transition-colors"
                  >
                    🇯🇵 日本語
                  </button>
                </div>
              )}

              {game_phase === "Setup" && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleSend("เลือก Preset A: มนุษย์อ่อนแอ")}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 rounded border border-blue-800/50 text-sm transition-colors"
                  >
                    🧍‍♂️ Preset A (มนุษย์อ่อนแอ)
                  </button>
                  <button
                    onClick={() => handleSend("เลือก Preset B: ราชาปีศาจ")}
                    disabled={isLoading}
                    className="px-4 py-2 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 rounded border border-purple-800/50 text-sm transition-colors"
                  >
                    👑 Preset B (ราชาปีศาจ)
                  </button>
                </div>
              )}

              {game_phase === "Playing" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      handleSend("สำรวจพื้นที่รอบๆ อย่างระมัดระวัง")
                    }
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 rounded border border-neutral-700/50 text-xs transition-colors"
                  >
                    🔍 สำรวจพื้นที่
                  </button>
                  <button
                    onClick={() =>
                      handleSend("ตรวจสอบสภาพร่างกายและสิ่งของที่มีทั้งหมด")
                    }
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 rounded border border-neutral-700/50 text-xs transition-colors"
                  >
                    🎒 เช็กกระเป๋า
                  </button>
                  <button
                    onClick={() =>
                      handleSend("หาที่ปลอดภัยเพื่อพักผ่อนและฟื้นฟูพลัง")
                    }
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 rounded border border-neutral-700/50 text-xs transition-colors"
                  >
                    ⛺ พักผ่อน
                  </button>
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
                      : game_phase === "Setup"
                        ? "หรือพิมพ์อธิบายตัวละคร Custom ของคุณเอง..."
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

      {game_phase !== "Language_Selection" && (
        <div
          className={`w-80 bg-neutral-950 p-6 overflow-y-auto flex flex-col gap-8 border-l transition-colors duration-500 ${isLowHp ? "border-red-900/30" : "border-neutral-800"}`}
        >
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
      )}
    </div>
  );
}
