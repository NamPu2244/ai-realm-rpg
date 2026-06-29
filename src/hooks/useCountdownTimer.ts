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
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, activeCountdown.seconds - elapsed);
      setCountdownSecondsLeft(remaining);
      if (remaining <= 0 && !countdownTriggeredRef.current) {
        countdownTriggeredRef.current = true;
        clearInterval(interval);
        setTimeout(() => onExpire(activeCountdown.label), 0);
      }
    }, 100);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCountdown]);

  return { countdownSecondsLeft };
}
