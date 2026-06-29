import { useRef, useState, useEffect } from "react";
import { playQteAlert, playQteTimeout } from "@/lib/sounds";
import { QTE_TIMEOUT_SIGNAL } from "@/lib/gameText";

export function useQteTimer(
  isQteActive: boolean,
  qteTimeLimit: number,
  isLoading: boolean,
  onTimeout: (signal: string) => void,
) {
  const [qteTimeLeft, setQteTimeLeft] = useState(0);
  const qteTriggeredRef = useRef(false);
  const qteTimerTickedRef = useRef(false);

  useEffect(() => {
    if (!isQteActive) {
      qteTimerTickedRef.current = false;
      const t = setTimeout(() => setQteTimeLeft(0), 0);
      return () => clearTimeout(t);
    }
    playQteAlert();
    qteTriggeredRef.current = false;
    qteTimerTickedRef.current = false;
    const effectiveLimit = Math.max(qteTimeLimit, 5);
    const startTime = Date.now();
    const interval = setInterval(() => {
      qteTimerTickedRef.current = true;
      const elapsed = (Date.now() - startTime) / 1000;
      setQteTimeLeft(Math.max(0, effectiveLimit - elapsed));
    }, 100);
    return () => clearInterval(interval);
  }, [isQteActive, qteTimeLimit]);

  useEffect(() => {
    if (isQteActive && qteTimeLeft <= 0 && qteTimeLimit > 0 && !isLoading && !qteTriggeredRef.current && qteTimerTickedRef.current) {
      qteTriggeredRef.current = true;
      playQteTimeout();
      const t = setTimeout(() => onTimeout(QTE_TIMEOUT_SIGNAL), 0);
      return () => clearTimeout(t);
    }
  }, [qteTimeLeft, isQteActive, qteTimeLimit, isLoading, onTimeout]);

  return { qteTimeLeft };
}
