import { useRef, useState, useEffect } from "react";
import { CountdownEvent } from "@/store/useGameStore";

export function useCountdownTimer(
  activeCountdown: CountdownEvent | null,
  onExpire: (label: string) => void,
) {
  const [countdownSecondsLeft, setCountdownSecondsLeft] = useState(0);
  const countdownTriggeredRef = useRef(false);

  useEffect(() => {
    if (!activeCountdown) {
      countdownTriggeredRef.current = false;
      const t = setTimeout(() => setCountdownSecondsLeft(0), 0);
      return () => clearTimeout(t);
    }
    countdownTriggeredRef.current = false;
    // Anchor on the absolute start time so the clock keeps counting across a reload
    // (fall back to "now" for legacy countdowns saved before started_at existed).
    const startTime = activeCountdown.started_at ?? Date.now();
    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, activeCountdown.seconds - elapsed);
      setCountdownSecondsLeft(remaining);
      if (remaining <= 0 && !countdownTriggeredRef.current) {
        countdownTriggeredRef.current = true;
        clearInterval(interval);
        setTimeout(() => onExpire(activeCountdown.label), 0);
      }
    };
    const interval = setInterval(tick, 100);
    tick(); // render correct remaining immediately, before the first interval fires
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCountdown]);

  return { countdownSecondsLeft };
}
