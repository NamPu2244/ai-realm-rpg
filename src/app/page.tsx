"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import AuthScreen from "@/components/AuthScreen";
import MainMenuDashboard from "@/components/MainMenuDashboard";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { usePhaseSync } from "@/lib/phaseRoute";

export default function LandingPage() {
  const {
    game_phase,
    setGameState,
    fetchUserSaves,
    fetchSubscriptionStatus,
    fetchEnergyBalance,
  } = useGameStore();

  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(() => {
    if (globalThis.location === undefined) return false;
    return new URLSearchParams(globalThis.location.search).get("upgrade") === "success";
  });

  // game_phase stays the source of truth; if it points to /create or /play
  // (e.g. a guest resuming a persisted game), bounce there.
  const hydrated = usePhaseSync("/");

  // Auth session management (app-wide entry point — navigation into the game
  // always originates from this landing route).
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
        fetchEnergyBalance();
        if (useGameStore.getState().game_phase !== "Playing") {
          setGameState({ game_phase: "Dashboard" });
        }
      } else if (
        useGameStore.getState().auth_status !== "guest" &&
        useGameStore.getState().game_phase !== "Playing"
      ) {
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

  // Stripe upgrade success toast (checkout returns to "/?upgrade=success").
  useEffect(() => {
    if (!showUpgradeSuccess) return;
    fetchSubscriptionStatus();
    const url = new URL(globalThis.location.href);
    url.searchParams.delete("upgrade");
    globalThis.history.replaceState(null, "", url.toString());
    const t = setTimeout(() => setShowUpgradeSuccess(false), 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hydrated) return null;

  return (
    <>
      {game_phase === "Auth" ? <AuthScreen /> : <MainMenuDashboard />}

      {showUpgradeSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-level-up-pop">
          <div className="px-6 py-3 bg-emerald-900/90 border border-emerald-400/60 rounded-xl shadow-[0_0_30px_rgba(52,211,153,0.3)] text-center">
            <p className="text-xs text-emerald-400/80 uppercase tracking-widest mb-0.5">Success!</p>
            <p className="text-base font-bold text-emerald-300">You now have Pro access ✦</p>
          </div>
        </div>
      )}
    </>
  );
}
