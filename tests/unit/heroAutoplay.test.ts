import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const heroSource = () =>
  readFileSync(path.join(process.cwd(), "components", "Hero.tsx"), "utf8");

describe("homepage CMS hero autoplay wiring", () => {
  it("keeps autoplay deterministic for the initial server/client render", () => {
    const source = heroSource();

    expect(source).toContain("export const HERO_AUTOPLAY_INTERVAL_MS = 5000");
    expect(source).toContain("window.setInterval(() => next(false), HERO_AUTOPLAY_INTERVAL_MS)");
    expect(source).toContain("window.clearInterval(interval)");
    expect(source).toContain("timerResetSignal");
    expect(source).toContain("isHoverPaused || isDragging");
    expect(source).not.toContain("useCarouselAutoplay");
  });

  it("renders only CMS-provided slides and preserves the Hero API surface", () => {
    const source = heroSource();

    expect(source).toContain("type HeroProps");
    expect(source).toContain("slides?: HomepageSlide[] | null");
    expect(source).toContain("const heroSlides = slides ?? []");
    expect(source).not.toContain("products?: Product[]");
    expect(source).not.toContain("variantImages");
  });

  it("keeps only dots in the bottom controls without a slide counter", () => {
    const source = heroSource();

    expect(source).toContain("const Dots = styled.div`");
    expect(source).toContain('width: ${({ $active }) => ($active ? "24px" : "8px")}');
    expect(source).toContain('$active ? "#e85d00" : "rgba(255, 255, 255, 0.4)"');
    expect(source).not.toContain("const Counter");
    expect(source).not.toContain("CounterActive");
    expect(source).not.toContain("formatCounter");
    expect(source).not.toContain("formatTotal");
    expect(source).not.toContain("<PauseToggle");
    expect(source).not.toContain("FaPause");
    expect(source).not.toContain("FaPlay");
  });

  it("renders CMS slides as a viewport-height full-bleed strip", () => {
    const source = heroSource();

    expect(source).toContain("height: 55vh");
    expect(source).toContain("min-height: 340px");
    expect(source).toContain("height: 75vh");
    expect(source).toContain("max-height: 680px");
    expect(source).toContain("const SlideTrack = styled.div");
    expect(source).toContain("display: flex");
    expect(source).toContain("width: `${slideCount * 100}%`");
    expect(source).toContain("width: `${slideWidthPercent}%`");
    expect(source).toContain("flex-shrink: 0");
    expect(source).toContain("const ImageFrame = styled.div");
    expect(source).toContain("position: relative");
    expect(source).toContain("width: 100%");
    expect(source).toContain("height: 100%");
    expect(source).toContain("bottom: 60px");
    expect(source).toContain("right: 0");
    expect(source).toContain("left: 0");
    expect(source).toContain("width: min(980px, calc(100% - 36px))");
    expect(source).toContain("margin: 0 auto");
    expect(source).toContain("text-align: center");
    expect(source).toContain("font-size: 10px");
    expect(source).toContain("font-size: clamp(1.6rem, 3vw, 2.8rem)");
    expect(source).toContain("font-size: 0.85rem");
    expect(source).toContain("padding: 10px 24px");
    expect(source).toContain('sizes="100vw"');
    expect(source).toContain('objectFit: "cover"');
    expect(source).toContain('objectPosition: "center"');
    expect(source).not.toContain('objectFit: "contain"');
    expect(source).not.toContain("height: 800px");
    expect(source).not.toContain("height: 100vh");
    expect(source).not.toContain("height: 580px");
  });

  it("renders only the primary buy CTA", () => {
    const source = heroSource();

    expect(source).toContain("const PrimaryCta = styled(Link)`");
    expect(source).toContain("background: #ff6a00");
    expect(source).toContain("border: 1px solid #ff8a2a");
    expect(source).not.toContain("const SecondaryCta");
    expect(source).not.toContain("<SecondaryCta");
    expect(source).not.toContain("Xem bộ sưu tập");
  });

  it("supports dragging the hero slider forward and backward", () => {
    const source = heroSource();

    expect(source).toContain("HERO_DRAG_THRESHOLD_PX = 80");
    expect(source).toContain("HERO_TRANSITION_MS = 700");
    expect(source).toContain("setPointerCapture");
    expect(source).toContain("releasePointerCapture");
    expect(source).toContain("useRef<number | null>(null)");
    expect(source).toContain("useState<1 | -1>(1)");
    expect(source).toContain("onPointerDown={startDrag}");
    expect(source).toContain("onPointerMove={updateDrag}");
    expect(source).toContain("onPointerUp={finishDrag}");
    expect(source).toContain("onPointerCancel={finishDrag}");
    expect(source).toContain("event.preventDefault()");
    expect(source).toContain("translateX(calc(-${trackTranslatePercent}% + ${dragDelta}px))");
    expect(source).toContain("transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)");
    expect(source).toContain("if (dragDistance < 0) next();");
    expect(source).toContain("else prev();");
    expect(source).toContain("touch-action: pan-y");
    expect(source).toContain('$isDragging ? "grabbing" : "grab"');
    expect(source).not.toContain("keyframes");
    expect(source).not.toContain("SlideStage");
  });

  it("keeps accessibility and hover pauses wired", () => {
    const source = heroSource();

    expect(source).toContain("onMouseEnter={() => setIsHoverPaused(true)}");
    expect(source).toContain("setIsHoverPaused(false)");
    expect(source).toContain('aria-roledescription="carousel"');
    expect(source).toContain('aria-label="Slider trang chủ"');
  });
});
