"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import styled from "styled-components";
import type { HomepageSlide } from "@/lib/adminHomepageSlider";
import { normalizeCatalogImage } from "@/lib/publicCatalog";

export const HERO_AUTOPLAY_INTERVAL_MS = 5000;
const HERO_TRANSITION_MS = 420;
const HERO_DRAG_THRESHOLD_PX = 48;
const HERO_DRAG_VELOCITY_THRESHOLD = 0.45;

type SlideDirection = 1 | -1;

const HeroShell = styled.section<{ $isDragging: boolean }>`
  position: relative;
  width: 100%;
  height: 55vh;
  min-height: 340px;
  overflow: hidden;
  background:
    radial-gradient(circle at 78% 28%, rgba(23, 214, 197, 0.12), transparent 30%),
    radial-gradient(circle at 18% 84%, rgba(232, 93, 0, 0.18), transparent 34%),
    #070707;
  cursor: ${({ $isDragging }) => ($isDragging ? "grabbing" : "grab")};
  touch-action: pan-y;
  user-select: none;

  @media (min-width: 768px) {
    height: 75vh;
    max-height: 680px;
  }
`;

const SlideTrack = styled.div`
  display: flex;
  height: 100%;
  will-change: transform;
`;

const Slide = styled.div`
  position: relative;
  height: 100%;
  flex-shrink: 0;
  overflow: hidden;
`;

const ImageFrame = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

const ContentLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  padding: 0 clamp(18px, 5vw, 72px);
  background:
    linear-gradient(90deg, rgba(7, 7, 7, 0.74) 0%, rgba(7, 7, 7, 0.28) 46%, rgba(7, 7, 7, 0.68) 100%),
    linear-gradient(to top, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.2) 54%, transparent 100%);
  text-align: center;
  text-shadow: 0 16px 36px rgba(0, 0, 0, 0.68);
`;

const Content = styled.div`
  position: absolute;
  bottom: clamp(58px, 11vh, 96px);
  left: clamp(18px, 5vw, 72px);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: min(760px, calc(100% - 36px));
  text-align: left;

  @media (max-width: 720px) {
    right: 18px;
    left: 18px;
    align-items: center;
    width: auto;
    text-align: center;
  }
`;

const Eyebrow = styled.span`
  display: inline-flex;
  border: 1px solid rgba(255, 178, 63, 0.4);
  border-radius: 0;
  background: rgba(17, 16, 14, 0.84);
  clip-path: polygon(0 5px, 5px 5px, 5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) calc(100% - 5px), calc(100% - 5px) 100%, 0 100%);
  padding: 8px 13px;
  color: #ffb23f;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-shadow: none;
`;

const Title = styled.h1`
  margin: 16px 0 0;
  color: #f2eee7;
  font-family: var(--font-display), var(--font-body), sans-serif;
  font-size: clamp(3.1rem, 8vw, 7.4rem);
  font-weight: 800;
  letter-spacing: 0;
  line-height: 0.82;
  text-transform: uppercase;
`;

const Subtitle = styled.p`
  max-width: min(640px, 88vw);
  margin: 18px 0 0;
  color: rgba(242, 238, 231, 0.82);
  font-size: clamp(0.92rem, 1.6vw, 1.08rem);
  font-weight: 700;
  line-height: 1.55;
`;

const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
`;

const PrimaryCta = styled(Link)`
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  border: 1px solid #ffb23f;
  border-radius: 0;
  background: #e85d00;
  clip-path: polygon(0 8px, 8px 8px, 8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.16),
    0 12px 30px rgba(255, 106, 0, 0.42);
  padding: 10px 24px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 1.6px;
  text-decoration: none;
  text-transform: uppercase;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: #ff7a1a;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.22),
      0 16px 34px rgba(255, 106, 0, 0.5);
    transform: translateY(-1px);
  }
`;

const Arrow = styled.button<{ $side: "left" | "right" }>`
  position: absolute;
  top: 50%;
  ${({ $side }) => $side}: 24px;
  z-index: 4;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.36);
  color: #ffffff;
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.58);
    transform: translateY(-50%) scale(1.04);
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const Dots = styled.div`
  position: absolute;
  right: 0;
  bottom: 20px;
  left: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
`;

const Dot = styled.button<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? "24px" : "8px")};
  height: 8px;
  border: 0;
  border-radius: 999px;
  background: ${({ $active }) =>
    $active ? "#e85d00" : "rgba(255, 255, 255, 0.4)"};
  padding: 0;
  cursor: pointer;
  transition:
    width 0.3s ease,
    background 0.2s ease;
`;

type HeroProps = {
  slides?: HomepageSlide[] | null;
};

function getSlideText(slide: HomepageSlide) {
  return {
    eyebrow: slide.eyebrow || "RA MẮT 2025",
    title: slide.title || "VANIE BLIND BOX",
    subtitle: slide.subtitle || "Bộ sưu tập khủng long phiên bản giới hạn",
    primaryLabel: slide.ctaLabel || "MUA NGAY",
    primaryUrl: slide.ctaUrl || "/bo-suu-tap",
  };
}

export default function Hero({ slides = null }: HeroProps) {
  const heroSlides = slides ?? [];
  const slideCount = heroSlides.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<SlideDirection>(1);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [timerResetSignal, setTimerResetSignal] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const currentIndexRef = useRef(0);
  const dragStartX = useRef<number | null>(null);
  const dragStartTime = useRef(0);
  const dragDeltaRef = useRef(0);
  const dragFrameRef = useRef<number | null>(null);
  const arrowPointerCommittedRef = useRef(false);
  const arrowClickGuardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getTrackTransform = useCallback(
    (index: number, deltaPx = 0) => {
      if (slideCount === 0) return "translateX(0)";
      const translatePercent = index * (100 / slideCount);
      return `translateX(calc(-${translatePercent}% + ${deltaPx}px))`;
    },
    [slideCount],
  );

  const applyDragTransform = useCallback(() => {
    dragFrameRef.current = null;
    if (!trackRef.current) return;

    trackRef.current.style.transform = getTrackTransform(
      currentIndexRef.current,
      dragDeltaRef.current,
    );
  }, [getTrackTransform]);

  const getVisibleIndex = useCallback(() => {
    if (!trackRef.current || slideCount === 0) return currentIndexRef.current;

    const transform = trackRef.current.style.transform;
    const match = transform.match(/translateX\(calc\((-?\d+(?:\.\d+)?)%/);
    if (!match) return currentIndexRef.current;

    const percent = Math.abs(Number(match[1]));
    const slidePercent = 100 / slideCount;
    return Math.round(percent / slidePercent) % slideCount;
  }, [slideCount]);

  const commitSlideIndex = useCallback(
    (
      getNextIndex: (current: number) => number,
      dir: SlideDirection,
      resetTimer = true,
    ) => {
      if (slideCount < 2) return;

      const current = getVisibleIndex();
      const nextIndex = (getNextIndex(current) + slideCount) % slideCount;
      if (nextIndex === current) return;

      setDirection(dir);
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      if (trackRef.current) {
        trackRef.current.style.transition = "";
        trackRef.current.style.transform = getTrackTransform(nextIndex);
      }
      if (resetTimer) setTimerResetSignal((signal) => signal + 1);
    },
    [getTrackTransform, getVisibleIndex, slideCount],
  );

  const goTo = useCallback(
    (index: number, dir: SlideDirection, resetTimer = true) => {
      commitSlideIndex(() => index, dir, resetTimer);
    },
    [commitSlideIndex],
  );

  const next = useCallback(
    (resetTimer = true) => {
      commitSlideIndex((index) => index + 1, 1, resetTimer);
    },
    [commitSlideIndex],
  );

  const prev = useCallback(
    (resetTimer = true) => {
      commitSlideIndex((index) => index - 1, -1, resetTimer);
    },
    [commitSlideIndex],
  );

  const stopArrowPropagation = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  const releasePrev = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    arrowPointerCommittedRef.current = true;
    if (arrowClickGuardTimerRef.current) clearTimeout(arrowClickGuardTimerRef.current);
    arrowClickGuardTimerRef.current = setTimeout(() => {
      arrowPointerCommittedRef.current = false;
      arrowClickGuardTimerRef.current = null;
    }, 0);
    prev();
  };

  const releaseNext = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    arrowPointerCommittedRef.current = true;
    if (arrowClickGuardTimerRef.current) clearTimeout(arrowClickGuardTimerRef.current);
    arrowClickGuardTimerRef.current = setTimeout(() => {
      arrowPointerCommittedRef.current = false;
      arrowClickGuardTimerRef.current = null;
    }, 0);
    next();
  };

  const clickPrev = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (arrowPointerCommittedRef.current) {
      arrowPointerCommittedRef.current = false;
      return;
    }
    prev();
  };

  const clickNext = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (arrowPointerCommittedRef.current) {
      arrowPointerCommittedRef.current = false;
      return;
    }
    next();
  };

  useEffect(() => {
    return () => {
      if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current);
      if (arrowClickGuardTimerRef.current) clearTimeout(arrowClickGuardTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setCurrentIndex((index) => {
      const nextIndex = Math.min(index, Math.max(slideCount - 1, 0));
      currentIndexRef.current = nextIndex;
      return nextIndex;
    });
  }, [slideCount]);

  useEffect(() => {
    if (slideCount < 2 || isHoverPaused || isDragging) return;

    const interval = window.setInterval(() => next(false), HERO_AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [isDragging, isHoverPaused, next, slideCount, timerResetSignal]);

  if (slideCount === 0) return null;

  const isInteractiveTarget = (target: EventTarget) =>
    target instanceof HTMLElement && Boolean(target.closest("a,button"));

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (slideCount < 2 || isInteractiveTarget(event.target)) return;

    event.preventDefault();
    dragStartX.current = event.clientX;
    dragStartTime.current = performance.now();
    dragDeltaRef.current = 0;
    if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current);
    if (trackRef.current) trackRef.current.style.transition = "none";
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateDrag = (event: PointerEvent<HTMLElement>) => {
    if (!isDragging || dragStartX.current === null) return;

    const nextDelta = event.clientX - dragStartX.current;
    dragDeltaRef.current = nextDelta;
    if (dragFrameRef.current === null) {
      dragFrameRef.current = requestAnimationFrame(applyDragTransform);
    }
  };

  const finishDrag = (event: PointerEvent<HTMLElement>) => {
    if (!isDragging) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const dragDistance = dragDeltaRef.current;
    const elapsed = Math.max(performance.now() - dragStartTime.current, 1);
    const velocity = Math.abs(dragDistance) / elapsed;
    dragStartX.current = null;
    dragStartTime.current = 0;
    dragDeltaRef.current = 0;
    setIsDragging(false);
    if (dragFrameRef.current !== null) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    if (trackRef.current) {
      trackRef.current.style.transition = "";
      trackRef.current.style.transform = getTrackTransform(currentIndexRef.current);
    }

    if (
      Math.abs(dragDistance) > HERO_DRAG_THRESHOLD_PX ||
      velocity > HERO_DRAG_VELOCITY_THRESHOLD
    ) {
      if (dragDistance < 0) next();
      else prev();
      return;
    }

    setTimerResetSignal((signal) => signal + 1);
  };

  const slideWidthPercent = slideCount > 0 ? 100 / slideCount : 100;

  return (
    <HeroShell
      $isDragging={isDragging}
      aria-roledescription="carousel"
      aria-label="Slider trang chủ"
      data-direction={direction}
      onMouseEnter={() => setIsHoverPaused(true)}
      onMouseLeave={() => setIsHoverPaused(false)}
      onPointerDown={startDrag}
      onPointerMove={updateDrag}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <SlideTrack
        ref={trackRef}
        style={{
          width: `${slideCount * 100}%`,
          transform: getTrackTransform(currentIndex),
          transition: isDragging
            ? "none"
            : `transform ${HERO_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        {heroSlides.map((slide, index) => {
          const slideText = getSlideText(slide);

          return (
            <Slide
              key={slide.id}
              style={{ width: `${slideWidthPercent}%` }}
              aria-hidden={index !== currentIndex}
            >
              <ImageFrame>
                <Image
                  src={normalizeCatalogImage(slide.imageUrl)}
                  alt={slide.altText}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
                <ContentLayer>
                  <Content>
                    <Eyebrow>{slideText.eyebrow}</Eyebrow>
                    <Title>{slideText.title}</Title>
                    <Subtitle>{slideText.subtitle}</Subtitle>
                    <CtaRow>
                      <PrimaryCta href={slideText.primaryUrl}>
                        {slideText.primaryLabel}
                      </PrimaryCta>
                    </CtaRow>
                  </Content>
                </ContentLayer>
              </ImageFrame>
            </Slide>
          );
        })}
      </SlideTrack>

      {slideCount > 1 ? (
        <>
          <Arrow
            type="button"
            $side="left"
            onPointerDown={stopArrowPropagation}
            onPointerUp={releasePrev}
            onPointerCancel={stopArrowPropagation}
            onClick={clickPrev}
            aria-label="Slide trước"
          >
            <FaChevronLeft />
          </Arrow>
          <Arrow
            type="button"
            $side="right"
            onPointerDown={stopArrowPropagation}
            onPointerUp={releaseNext}
            onPointerCancel={stopArrowPropagation}
            onClick={clickNext}
            aria-label="Slide tiếp theo"
          >
            <FaChevronRight />
          </Arrow>
          <Dots>
            {heroSlides.map((slide, index) => (
              <Dot
                type="button"
                key={slide.id}
                $active={index === currentIndex}
                onClick={() =>
                  goTo(index, index >= currentIndex ? 1 : -1)
                }
                aria-current={index === currentIndex ? "true" : undefined}
                aria-label={`Xem slide ${index + 1}`}
              />
            ))}
          </Dots>
        </>
      ) : null}
    </HeroShell>
  );
}
