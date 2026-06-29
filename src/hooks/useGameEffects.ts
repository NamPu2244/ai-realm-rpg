import { useRef, useState, useEffect } from "react";
import { playDamage, playLevelUp } from "@/lib/sounds";

export function useGameEffects(hp: number, level: number) {
  const prevHpRef = useRef(hp);
  const prevLevelRef = useRef(level);

  const [isShaking, setIsShaking] = useState(false);
  const [isDamageFlash, setIsDamageFlash] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpNum, setLevelUpNum] = useState(0);

  useEffect(() => {
    if (hp < prevHpRef.current) {
      setIsShaking(true);
      setIsDamageFlash(true);
      playDamage();
      const shakeTimer = setTimeout(() => setIsShaking(false), 400);
      const flashTimer = setTimeout(() => setIsDamageFlash(false), 350);
      prevHpRef.current = hp;
      return () => { clearTimeout(shakeTimer); clearTimeout(flashTimer); };
    }
    prevHpRef.current = hp;
  }, [hp]);

  useEffect(() => {
    if (level > prevLevelRef.current && prevLevelRef.current > 0) {
      setLevelUpNum(level);
      setShowLevelUp(true);
      playLevelUp();
      const timer = setTimeout(() => setShowLevelUp(false), 2200);
      prevLevelRef.current = level;
      return () => clearTimeout(timer);
    }
    prevLevelRef.current = level;
  }, [level]);

  return { isShaking, isDamageFlash, showLevelUp, levelUpNum };
}
