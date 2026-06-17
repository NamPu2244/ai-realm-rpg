"use client";

import { useState, useRef, useEffect } from "react";
import { buildSceneImageUrl } from "@/lib/gameText";

export default function SceneBanner({ imagePrompt, tone }: Readonly<{ imagePrompt: string; tone?: string }>) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [incomingSrc, setIncomingSrc] = useState<string | null>(() => buildSceneImageUrl(imagePrompt, tone));
  const [isIncomingVisible, setIsIncomingVisible] = useState(false);
  // Track the expected URL to discard stale onLoad events from old images
  const expectedRef = useRef<string>(buildSceneImageUrl(imagePrompt, tone));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const url = buildSceneImageUrl(imagePrompt, tone);
    if (url === expectedRef.current) return;
    expectedRef.current = url;
    setIncomingSrc(url);
    setIsIncomingVisible(false);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [imagePrompt, tone]);

  const handleLoad = () => {
    if (incomingSrc !== expectedRef.current) return;
    setIsIncomingVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCurrentSrc(expectedRef.current);
      setIncomingSrc(null);
      setIsIncomingVisible(false);
    }, 700);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showSkeleton = !currentSrc && !isIncomingVisible;

  return (
    <div
      className="relative shrink-0 overflow-hidden border-b border-amber-900/20"
      style={{ height: "200px" }}
    >
      {showSkeleton && (
        <div className="absolute inset-0 bg-stone-800/60">
          <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-stone-800/60 via-stone-600/30 to-stone-800/60 bg-[length:200%_100%]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-amber-500/40 tracking-widest uppercase animate-pulse">กำลังสร้างฉาก...</span>
          </div>
        </div>
      )}

      {currentSrc && (
        <img
          src={currentSrc}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isIncomingVisible ? "opacity-0" : "opacity-100"}`}
        />
      )}

      {incomingSrc && (
        <img
          src={incomingSrc}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isIncomingVisible ? "opacity-100" : "opacity-0"}`}
          onLoad={handleLoad}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/10 to-transparent" />
    </div>
  );
}
