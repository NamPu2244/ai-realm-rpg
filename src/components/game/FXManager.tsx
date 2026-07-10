"use client";

import { useEffect, useState } from "react";
import { playBoom, playThunder, setAmbientLoops, stopAllAmbient } from "@/lib/sounds";

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
  // Bump the flash key on the exact render where a new impactFx array carrying "flash"
  // arrives — set-during-render (guarded by the previous array tracked in state) restarts
  // the CSS animation without a setState-in-effect cascade.
  const [flashKey, setFlashKey] = useState(0);
  const [prevImpact, setPrevImpact] = useState(impactFx);
  if (impactFx !== prevImpact) {
    setPrevImpact(impactFx);
    if (impactFx.includes("flash")) setFlashKey((k) => k + 1);
  }

  // Sound is a pure external side-effect (no React state), so it belongs in an effect.
  useEffect(() => {
    if (impactFx.includes("flash")) playThunder();
    if (impactFx.includes("shake")) playBoom();
  }, [impactFx]);

  // Ambient weather loops follow environment_fx; stop them all when leaving the game.
  useEffect(() => {
    setAmbientLoops(environmentFx);
  }, [environmentFx]);
  useEffect(() => stopAllAmbient, []);

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
  // A new impactFx array carrying "shake" turns shaking on for 500ms. Flip it on via
  // set-during-render (React's "adjust state on a change" pattern, tracking the previous
  // array in state) so there's no synchronous setState inside the effect; the effect then
  // only arms a timer whose callback flips it back off (setState in a callback is allowed).
  const [shaking, setShaking] = useState(false);
  const [prevImpact, setPrevImpact] = useState(impactFx);
  if (impactFx !== prevImpact) {
    setPrevImpact(impactFx);
    if (impactFx.includes("shake")) setShaking(true);
  }

  useEffect(() => {
    if (!shaking) return;
    const t = setTimeout(() => setShaking(false), 500);
    return () => clearTimeout(t);
  }, [shaking]);
  return shaking;
}
