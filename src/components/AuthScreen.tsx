"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useGameStore } from "@/store/useGameStore";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const { setGameState } = useGameStore();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    const supabase = getSupabaseClient();

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // onAuthStateChange ใน page.tsx จะจัดการเปลี่ยนหน้าไป Dashboard ให้เอง
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setMessage("สร้างบัญชีสำเร็จ! กรุณายืนยันอีเมลของคุณ (ถ้าจำเป็น) แล้วเข้าสู่ระบบ");
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด ลองอีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    setGameState({ auth_status: "guest", game_phase: "Menu" });
  };

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-950 text-neutral-200 font-sans p-4">
      <div className="w-full max-w-md bg-neutral-900/60 border border-neutral-800 rounded-xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-widest">AI REALM</h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">
            {mode === "signin" ? "เข้าสู่ระบบเพื่อซิงค์การเดินทางของคุณ" : "สร้างบัญชีใหม่"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-neutral-500 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full bg-neutral-950 border border-neutral-700 focus:border-neutral-400 rounded px-4 py-3 focus:outline-none disabled:opacity-50 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-neutral-500 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full bg-neutral-950 border border-neutral-700 focus:border-neutral-400 rounded px-4 py-3 focus:outline-none disabled:opacity-50 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-950/40 border border-red-800/50 rounded text-sm text-red-300">
              ⚠️ {error}
            </div>
          )}
          {message && (
            <div className="px-4 py-3 bg-emerald-950/40 border border-emerald-800/50 rounded text-sm text-emerald-300">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-white text-black font-bold rounded hover:bg-neutral-300 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "..." : mode === "signin" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}
          </button>
        </form>

        <div className="text-center text-sm text-neutral-500">
          {mode === "signin" ? (
            <>
              ยังไม่มีบัญชี?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setMessage(null);
                }}
                className="text-neutral-300 hover:text-white underline"
              >
                สร้างบัญชีใหม่
              </button>
            </>
          ) : (
            <>
              มีบัญชีอยู่แล้ว?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setMessage(null);
                }}
                className="text-neutral-300 hover:text-white underline"
              >
                เข้าสู่ระบบ
              </button>
            </>
          )}
        </div>

        <div className="border-t border-neutral-800 pt-4 text-center">
          <button
            type="button"
            onClick={handleGuest}
            title="เล่นแบบไม่ login โดยบันทึกเกมไว้ในเครื่องนี้เท่านั้น"
            className="text-xs text-neutral-500 hover:text-neutral-300 uppercase tracking-wider transition-colors"
          >
            เล่นแบบไม่ระบุตัวตน (บันทึกในเครื่องนี้)
          </button>
        </div>
      </div>
    </div>
  );
}
