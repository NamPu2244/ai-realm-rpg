"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

/**
 * The game now lives across real routes instead of one client-swapped page.
 * `game_phase` remains the store's source-of-truth "intent" signal; each route
 * mirrors it to a URL. This keeps the store / AuthScreen / Dashboard unchanged
 * while giving the game its own address (`/play`) and world creation its own
 * (`/create`).
 */
export function phaseToPath(phase: string): string {
  switch (phase) {
    case "Menu":
      return "/create";
    case "Playing":
      return "/play";
    default:
      // Auth + Dashboard both live at the root landing route.
      return "/";
  }
}

/** True once the Zustand persist layer has rehydrated from localStorage. */
export function useHasHydrated(): boolean {
  // Persist rehydration is a client-only concern; on the server (prerender)
  // there is no `persist` API and nothing to wait for, so report not-hydrated.
  // The first client render MUST match that server output (false) or React
  // throws a hydration mismatch — Zustand's persist rehydrates synchronously,
  // so reading `hasHydrated()` in the initializer would return true and diverge.
  // Instead always start false and flip in an effect (post-hydration).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useGameStore.persist?.hasHydrated?.()) {
      setHydrated(true);
      return;
    }
    return useGameStore.persist?.onFinishHydration?.(() => setHydrated(true));
  }, []);
  return hydrated;
}

/**
 * Redirects to the route that matches the current `game_phase` whenever it
 * points somewhere other than `currentPath`. Waits for hydration first so a
 * direct visit / refresh doesn't flash-redirect on the pre-hydration defaults.
 * Returns whether hydration has completed so callers can gate rendering.
 */
export function usePhaseSync(currentPath: string): boolean {
  const router = useRouter();
  const game_phase = useGameStore((s) => s.game_phase);
  const hydrated = useHasHydrated();

  useEffect(() => {
    if (!hydrated) return;
    const target = phaseToPath(game_phase);
    if (target !== currentPath) router.replace(target);
  }, [game_phase, hydrated, currentPath, router]);

  return hydrated;
}
