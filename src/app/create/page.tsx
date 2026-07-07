"use client";

import { useRef, useState } from "react";
import { useGameStore, WorldConfig, genreToTheme } from "@/store/useGameStore";
import WorldCreationMenu from "@/components/WorldCreationMenu";
import { AlertModal } from "@/components/ui/Modal";
import { usePhaseSync } from "@/lib/phaseRoute";

export default function CreateRoute() {
  const {
    auth_status,
    is_pro,
    setGameState,
    createNewSaveSlot,
  } = useGameStore();

  const importInputRef = useRef<HTMLInputElement>(null);
  const [alertInfo, setAlertInfo] = useState<string | null>(null);

  // `game_phase` stays the source of truth; setting it to Playing / Dashboard
  // below makes this hook route to /play or / respectively.
  const hydrated = usePhaseSync("/create");

  const handleStartGame = async (config: WorldConfig) => {
    const configWithTheme: WorldConfig = {
      ...config,
      ui_theme: config.ui_theme ?? genreToTheme(config.genre),
    };
    setGameState({ world_config: configWithTheme });

    if (auth_status === "authenticated") {
      await createNewSaveSlot(configWithTheme);
    }

    // Setting Playing (with an empty history) flips usePhaseSync over to /play,
    // where PlayScreen detects the fresh world and kicks off the opening turn.
    setGameState({
      game_phase: "Playing",
      history: [],
      lives_left: config.tone === "hardcore" ? 0 : 3,
    });
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
      } catch (err) {
        console.error("Import Error:", err);
        setAlertInfo("ไฟล์เซฟไม่ถูกต้อง — โหลดไม่ได้");
      }
    };
    reader.readAsText(file);
  };

  if (!hydrated) return null;

  return (
    <>
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
