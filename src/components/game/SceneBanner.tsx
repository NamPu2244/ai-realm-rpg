"use client";

import { useState, useRef, useEffect } from "react";
import { buildSceneImageUrl } from "@/lib/gameText";

export default function SceneBanner({ imagePrompt }: { imagePrompt: string }) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [incomingSrc, setIncomingSrc] = useState<string | null>(() => buildSceneImageUrl(imagePrompt));
  const [isIncomingVisible, setIsIncomingVisible] = useState(false);
  // Track the expected URL to discard stale onLoad events from old images
  const expectedRef = useRef<string>(buildSceneImageUrl(imagePrompt));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const url = buildSceneImageUrl(imagePrompt);
    if (url === expectedRef.current) return;
    expectedRef.current = url;
    setIncomingSrc(url);
    setIsIncomingVisible(false);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [imagePrompt]);

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
        <div className="absolute inset-0 bg-stone-900">
          <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-stone-900 via-stone-700/40 to-stone-900 bg-[length:200%_100%]" />
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
