import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const heroSource = () =>
  readFileSync(path.join(process.cwd(), "components", "Hero.tsx"), "utf8");

describe("homepage CMS hero autoplay wiring", () => {
  it("keeps autoplay deterministic for the initial server/client render", () => {
    const source = heroSource();

    expect(source).toContain("export const HERO_AUTOPLAY_INTERVAL_MS = 5000");
    expect(source).toContain("useCarouselAutoplay");
    expect(source).toContain("resetSignal: autoplayResetSignal");
    expect(source).toContain("isPaused: isFocusPaused");
    expect(source).not.toContain("isHoverPaused");
    expect(source).not.toContain("isUserPaused");
  });

  it("renders only CMS-provided slides and preserves the Hero API surface", () => {
    const source = heroSource();

    expect(source).toContain("type HeroProps");
    expect(source).toContain("slides?: HomepageSlide[] | null");
    expect(source).toContain("const heroSlides = slides ?? []");
    expect(source).not.toContain("products?: Product[]");
    expect(source).not.toContain("variantImages");
  });

  it("keeps progress bar markup stable during hydration", () => {
    const source = heroSource();
    const progressBlock =
      source.match(/<ProgressWrap[\s\S]*?<\/ProgressWrap>/)?.[0] ?? "";

    expect(source).toContain("const ProgressWrap = styled.div`");
    expect(source).toContain("@media (prefers-reduced-motion: reduce)");
    expect(progressBlock).toContain('<ProgressWrap aria-hidden="true">');
    expect(progressBlock).not.toContain("$hidden");
    expect(progressBlock).not.toContain("isReducedMotionPaused");
  });

  it("keeps only dots in the bottom controls", () => {
    const source = heroSource();
    const controlsBlock =
      source.match(/<ControlGroup[\s\S]*?<\/ControlGroup>/)?.[0] ?? "";

    expect(controlsBlock).toContain("<Dots>");
    expect(controlsBlock).not.toContain("<Counter");
    expect(controlsBlock).not.toContain("<PauseToggle");
    expect(source).not.toContain("FaPause");
    expect(source).not.toContain("FaPlay");
  });

  it("keeps accessibility pauses without hover pause handlers", () => {
    const source = heroSource();

    expect(source).toContain("onFocusCapture");
    expect(source).toContain("onBlurCapture");
    expect(source).toContain("event.currentTarget.contains(nextFocusedElement)");
    expect(source).not.toContain("onMouseEnter");
    expect(source).not.toContain("onMouseLeave");
  });
});
