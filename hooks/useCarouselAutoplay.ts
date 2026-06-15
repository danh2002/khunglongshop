"use client";

import { useEffect, useState } from "react";

type UseCarouselAutoplayParams = {
  slideCount: number;
  intervalMs: number;
  isPaused: boolean;
  resetSignal: number;
  onAdvance: () => void;
};

export function useCarouselAutoplay({
  slideCount,
  intervalMs,
  isPaused,
  resetSignal,
  onAdvance,
}: UseCarouselAutoplayParams) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    setPrefersReducedMotion(mediaQuery.matches);

    function updateReducedMotion() {
      setPrefersReducedMotion(mediaQuery.matches);
    }

    mediaQuery.addEventListener("change", updateReducedMotion);
    return () => mediaQuery.removeEventListener("change", updateReducedMotion);
  }, []);

  useEffect(() => {
    function updateVisibility() {
      setIsTabHidden(document.visibilityState === "hidden");
    }

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (slideCount < 2 || isPaused || prefersReducedMotion || isTabHidden) {
      return;
    }

    const timer = window.setInterval(onAdvance, intervalMs);
    return () => window.clearInterval(timer);
  }, [
    intervalMs,
    isPaused,
    isTabHidden,
    onAdvance,
    prefersReducedMotion,
    resetSignal,
    slideCount,
  ]);

  return {
    isAutoplayPaused: isPaused || prefersReducedMotion || isTabHidden,
    isReducedMotionPaused: prefersReducedMotion,
    isTabHidden,
  };
}
