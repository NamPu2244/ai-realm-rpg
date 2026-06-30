"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { buildSceneImageUrl } from "@/lib/gameText";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

export default function SceneBanner({ imagePrompt, tone }: Readonly<{ imagePrompt: string; tone?: string }>) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [incomingSrc, setIncomingSrc] = useState<string | null>(() => buildSceneImageUrl(imagePrompt, tone));
  const [isIncomingVisible, setIsIncomingVisible] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const expectedRef = useRef<string>(buildSceneImageUrl(imagePrompt, tone));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const startLoad = useCallback((url: string) => {
    expectedRef.current = url;
    retryCountRef.current = 0;
    setLoadFailed(false);
    setIncomingSrc(url);
    setIsIncomingVisible(false);
  }, []);

  useEffect(() => {
    const url = buildSceneImageUrl(imagePrompt, tone);
    if (url === expectedRef.current) return;
    startLoad(url);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [imagePrompt, tone, startLoad]);

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

  const handleError = () => {
    if (incomingSrc !== expectedRef.current) return;
    if (retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current += 1;
      const url = expectedRef.current;
      timerRef.current = setTimeout(() => {
        // bust cache by toggling incomingSrc to force img remount
        setIncomingSrc(null);
        setTimeout(() => setIncomingSrc(url), 50);
      }, RETRY_DELAY_MS * retryCountRef.current);
    } else {
      setLoadFailed(true);
      setIncomingSrc(null);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showSkeleton = !currentSrc && !isIncomingVisible && !loadFailed;

  return (
    <div className="relative shrink-0 overflow-visible" style={{ height: "260px", marginBottom: "-64px" }}>
      <div className="absolute inset-0 overflow-hidden">
        {showSkeleton && (
          <div className="absolute inset-0 bg-stone-800/60">
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-stone-800/60 via-stone-600/30 to-stone-800/60 bg-[length:200%_100%]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-amber-500/40 tracking-widest uppercase animate-pulse">Generating scene...</span>
            </div>
          </div>
        )}

        {loadFailed && !currentSrc && (
          <div className="absolute inset-0 bg-stone-900/80 flex items-center justify-center">
            <span className="text-xs text-stone-500 tracking-widest uppercase">Image could not be loaded</span>
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
            onError={handleError}
          />
        )}

        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-stone-950/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-950 via-stone-950/70 to-transparent" />
      </div>
    </div>
  );
}
