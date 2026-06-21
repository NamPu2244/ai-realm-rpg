"use client";

import { useState } from "react";
import { AlertTriangle, Sword, Sparkles, Shield, Eye, EyeOff } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useGameStore } from "@/store/useGameStore";

type Mode = "signin" | "signup";

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

const PARTICLES: Particle[] = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: (i * 4.7) % 100,
  delay: (i * 1.37) % 12,
  duration: 9 + (i * 1.13) % 11,
  size: 2 + (i * 0.7) % 4,
}));

function SubmitLabel({ mode, isLoading }: Readonly<{ mode: Mode; isLoading: boolean }>) {
  if (isLoading) {
    const text = mode === "signin" ? "กำลังเข้าสู่ระบบ..." : "กำลังสร้างบัญชี...";
    return (
      <>
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {text}
      </>
    );
  }
  return <>{mode === "signin" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}</>;
}

export default function AuthScreen() {
  const { setGameState } = useGameStore();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    const supabase = getSupabaseClient();

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
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

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-neutral-950 text-neutral-200 font-sans p-4">

      {/* ── Background layers ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-5%,rgba(217,119,6,0.13),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_100%_100%,rgba(120,53,15,0.18),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_0%_80%,rgba(20,20,50,0.3),transparent)]" />
      </div>

      {/* ── Floating particles ── */}
      {PARTICLES.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full bg-amber-400/25 pointer-events-none"
          style={{
            left: `${p.x}%`,
            bottom: -8,
            width: p.size,
            height: p.size,
            animation: `floatParticle ${p.duration}s ${-p.delay}s ease-in-out infinite`,
          }}
        />
      ))}

      {/* ── Card ── */}
      <div className="relative w-full max-w-sm animate-[authCardIn_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]">

        {/* Soft glow behind card */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-amber-700/20 via-transparent to-orange-900/20 blur-2xl" />

        <div className="relative bg-neutral-950/85 backdrop-blur-md border border-amber-900/25 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden">

          {/* Top shimmer line */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

          <div className="px-8 pt-8 pb-7 space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col items-center gap-3">
              {/* Rune ring */}
              <div
                className="w-[70px] h-[70px] rounded-full border border-amber-700/40 flex items-center justify-center"
                style={{ animation: "glowPulse 3s ease-in-out infinite" }}
              >
                <div className="w-[52px] h-[52px] rounded-full border border-amber-600/25 bg-amber-900/10 flex items-center justify-center relative">
                  <Sword size={22} className="text-amber-400" />
                  <Sparkles
                    size={9}
                    className="absolute -top-1 -right-1 text-amber-300"
                  />
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-[1.7rem] font-extrabold tracking-[0.35em] bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400 bg-clip-text text-transparent leading-none">
                  STORYWEAVE
                </h1>
                <p className="text-[10px] text-neutral-600 mt-1.5 uppercase tracking-[0.25em]">
                  Fantasy RPG Adventure
                </p>
              </div>
            </div>

            {/* ── Mode tab switcher ── */}
            <div className="relative flex bg-neutral-900/70 rounded-xl p-1 border border-neutral-800/40">
              {/* Sliding indicator */}
              <div
                className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-amber-900/35 border border-amber-700/30 transition-transform duration-300 ease-out"
                style={{ transform: mode === "signup" ? "translateX(100%)" : "translateX(0)" }}
              />
              {(["signin", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors duration-300 ${
                    mode === m ? "text-amber-300" : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {m === "signin" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}
                </button>
              ))}
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="auth-email" className="text-[10px] text-neutral-500 uppercase tracking-widest">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  placeholder="you@example.com"
                  className="w-full bg-neutral-900/50 border border-neutral-700/50 focus:border-amber-600/60 rounded-xl px-4 py-3 text-sm focus:outline-none disabled:opacity-50 transition-all duration-250 placeholder:text-neutral-700 focus:bg-neutral-900/80 focus:shadow-[0_0_0_3px_rgba(217,119,6,0.1)]"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="auth-password" className="text-[10px] text-neutral-500 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    placeholder="••••••••"
                    className="w-full bg-neutral-900/50 border border-neutral-700/50 focus:border-amber-600/60 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none disabled:opacity-50 transition-all duration-250 placeholder:text-neutral-700 focus:bg-neutral-900/80 focus:shadow-[0_0_0_3px_rgba(217,119,6,0.1)]"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Feedback */}
              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-red-950/30 border border-red-800/40 rounded-xl text-xs text-red-300 animate-[shake_0.4s_ease-in-out]">
                  <AlertTriangle size={13} className="shrink-0 mt-px" />
                  {error}
                </div>
              )}
              {message && (
                <div className="px-4 py-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-300">
                  {message}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full py-3 rounded-xl font-bold text-sm overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-200"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 transition-opacity duration-300" />
                <span className="absolute inset-0 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {/* Shimmer sweep on hover */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.18)_50%,transparent_65%)] bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite] transition-opacity duration-300" />
                <span className="relative text-neutral-950 font-bold tracking-wide flex items-center justify-center gap-2">
                  <SubmitLabel mode={mode} isLoading={isLoading} />
                </span>
              </button>
            </form>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-neutral-800/60" />
              <span className="text-[10px] text-neutral-700 uppercase tracking-widest">หรือ</span>
              <div className="flex-1 h-px bg-neutral-800/60" />
            </div>

            {/* ── Guest ── */}
            <button
              type="button"
              onClick={() => setGameState({ auth_status: "guest", game_phase: "Menu" })}
              title="เล่นแบบไม่ login โดยบันทึกเกมไว้ในเครื่องนี้เท่านั้น"
              className="group flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-neutral-800/50 hover:border-neutral-700/60 text-neutral-500 hover:text-neutral-300 text-xs tracking-wide transition-all duration-250 hover:bg-neutral-900/40"
            >
              <Shield size={13} className="text-neutral-600 group-hover:text-neutral-400 transition-colors" />
              เล่นแบบไม่ระบุตัวตน
              <span className="text-neutral-700 group-hover:text-neutral-600 transition-colors">(บันทึกในเครื่องนี้)</span>
            </button>
          </div>

          {/* Bottom accent line */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-neutral-800/50 to-transparent" />
        </div>
      </div>
    </div>
  );
}
