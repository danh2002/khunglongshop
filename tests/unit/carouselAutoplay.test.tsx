/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCarouselAutoplay } from "@/hooks/useCarouselAutoplay";

const INTERVAL_MS = 1000;

function mockReducedMotion(matches = false) {
  const listeners = new Set<() => void>();
  const mediaQuery = {
    matches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn((_event: string, listener: () => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_event: string, listener: () => void) => {
      listeners.delete(listener);
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue(mediaQuery),
  });

  return {
    mediaQuery,
    setMatches(nextMatches: boolean) {
      Object.defineProperty(mediaQuery, "matches", {
        configurable: true,
        value: nextMatches,
      });
      listeners.forEach((listener) => listener());
    },
  };
}

function setDocumentVisibility(visibilityState: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: visibilityState,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

function renderAutoplayHook({
  slideCount = 2,
  isPaused = false,
  resetSignal = 0,
  onAdvance = vi.fn(),
} = {}) {
  return {
    onAdvance,
    ...renderHook(
      (props: {
        slideCount: number;
        isPaused: boolean;
        resetSignal: number;
        onAdvance: () => void;
      }) =>
        useCarouselAutoplay({
          slideCount: props.slideCount,
          intervalMs: INTERVAL_MS,
          isPaused: props.isPaused,
          resetSignal: props.resetSignal,
          onAdvance: props.onAdvance,
        }),
      {
        initialProps: {
          slideCount,
          isPaused,
          resetSignal,
          onAdvance,
        },
      }
    ),
  };
}

describe("useCarouselAutoplay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReducedMotion(false);
    setDocumentVisibility("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts autoplay after the configured interval", () => {
    const { onAdvance } = renderAutoplayHook();

    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS - 1);
    });
    expect(onAdvance).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("does not start autoplay with zero or one slide", () => {
    const zeroSlide = renderAutoplayHook({ slideCount: 0 });
    const oneSlide = renderAutoplayHook({ slideCount: 1 });

    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS);
    });

    expect(zeroSlide.onAdvance).not.toHaveBeenCalled();
    expect(oneSlide.onAdvance).not.toHaveBeenCalled();
  });

  it("does not start when reduced motion is enabled", () => {
    mockReducedMotion(true);
    const { onAdvance, result } = renderAutoplayHook();

    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS);
    });

    expect(onAdvance).not.toHaveBeenCalled();
    expect(result.current.isReducedMotionPaused).toBe(true);
  });

  it("pauses while hovered and resumes with a fresh timer after hover leaves", () => {
    const { onAdvance, rerender } = renderAutoplayHook({ isPaused: true });

    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS);
    });
    expect(onAdvance).not.toHaveBeenCalled();

    rerender({
      slideCount: 2,
      isPaused: false,
      resetSignal: 0,
      onAdvance,
    });
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS - 1);
    });
    expect(onAdvance).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("restarts the timer after manual navigation", () => {
    const { onAdvance, rerender } = renderAutoplayHook();

    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS - 200);
    });
    rerender({
      slideCount: 2,
      isPaused: false,
      resetSignal: 1,
      onAdvance,
    });
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS - 1);
    });
    expect(onAdvance).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("manual navigation does not clear active pause sources", () => {
    const { onAdvance, rerender } = renderAutoplayHook({ isPaused: true });

    rerender({
      slideCount: 2,
      isPaused: true,
      resetSignal: 1,
      onAdvance,
    });
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS);
    });

    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("click dot while hovering resets the timer and keeps autoplay paused", () => {
    const { onAdvance, rerender } = renderAutoplayHook({ isPaused: true });

    rerender({
      slideCount: 2,
      isPaused: true,
      resetSignal: 1,
      onAdvance,
    });
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS);
    });

    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("click dot then mouse out starts a fresh one-second timer", () => {
    const { onAdvance, rerender } = renderAutoplayHook({ isPaused: true });

    rerender({
      slideCount: 2,
      isPaused: true,
      resetSignal: 1,
      onAdvance,
    });
    rerender({
      slideCount: 2,
      isPaused: false,
      resetSignal: 1,
      onAdvance,
    });
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS - 1);
    });
    expect(onAdvance).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("pauses when the tab is hidden and resumes when the tab becomes visible", () => {
    const { onAdvance, result } = renderAutoplayHook();

    act(() => {
      setDocumentVisibility("hidden");
    });
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS);
    });
    expect(onAdvance).not.toHaveBeenCalled();
    expect(result.current.isTabHidden).toBe(true);

    act(() => {
      setDocumentVisibility("visible");
    });
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS - 1);
    });
    expect(onAdvance).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("clears the interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = renderAutoplayHook();

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
