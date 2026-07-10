"use client";

import { useEffect } from "react";
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
  } = useGameStore();

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

  if (!hydrated) return null;

  return (
    <>
      {game_phase === "Auth" ? <AuthScreen /> : <MainMenuDashboard />}
    </>
  );
}
