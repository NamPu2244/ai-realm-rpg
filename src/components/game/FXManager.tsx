"use client";

import { useEffect, useState } from "react";

// Renders the fixed, non-interactive cinematic overlays driven by the extraction model:
// ambient weather (rain/snow/fog/embers), the poisoned green vignette, and the one-shot
// white flash. The dizzy/drunk sway + narrative shake are transforms on the in-game
// content wrapper (applied by PlayScreen via sceneFxClass), not here. All values are
// pre-sanitized to the fixed vocabulary in @/lib/fx.
interface FXManagerProps {
  environmentFx: string[];
  playerCondition: string;
  impactFx: string[];
}

export default function FXManager({ environmentFx, playerCondition, impactFx }: Readonly<FXManagerProps>) {
  // One-shot white flash: re-key a fresh element each time a 'flash' impact arrives so the
  // CSS animation restarts. It ends at opacity 0 (animation-fill: forwards), so it can stay
  // mounted harmlessly between flashes.
  const [flashKey, setFlashKey] = useState(0);
  useEffect(() => {
    if (impactFx.includes("flash")) setFlashKey((k) => k + 1);
  }, [impactFx]);

  return (
    <>
      {environmentFx.includes("rain") && <div className="fx-overlay fx-rain" aria-hidden />}
      {environmentFx.includes("snow") && <div className="fx-overlay fx-snow" aria-hidden />}
      {environmentFx.includes("fog") && <div className="fx-overlay fx-fog" aria-hidden />}
      {environmentFx.includes("embers") && <div className="fx-overlay fx-embers" aria-hidden />}
      {playerCondition === "poisoned" && <div className="fx-overlay fx-poison" aria-hidden />}
      {flashKey > 0 && <div key={flashKey} className="fx-overlay fx-flash" style={{ zIndex: 35 }} aria-hidden />}
    </>
  );
}

// Class for the in-game content wrapper: persistent dizzy/drunk distortion. Shake is added
// transiently by the caller (see useNarrativeShake). Poisoned has no transform (overlay only).
export function sceneConditionClass(playerCondition: string): string {
  if (playerCondition === "dizzy") return "fx-cond-dizzy";
  if (playerCondition === "drunk") return "fx-cond-drunk";
  return "";
}

// Fires a 0.5s shake whenever a 'shake' impact arrives this turn. Returns whether the
// content wrapper should currently carry the .fx-shake class.
export function useNarrativeShake(impactFx: string[]): boolean {
  const [shaking, setShaking] = useState(false);
  useEffect(() => {
    if (!impactFx.includes("shake")) return;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 500);
    return () => clearTimeout(t);
  }, [impactFx]);
  return shaking;
}
