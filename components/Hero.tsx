"use client";

import Image from "next/image";
import Link from "next/link";
import {
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
const HERO_TRANSITION_MS = 700;
const HERO_DRAG_THRESHOLD_PX = 80;

const HeroShell = styled.section<{ $isDragging: boolean }>`
  position: relative;
  width: 100%;
  height: 55vh;
  min-height: 340px;
  overflow: hidden;
  background: #070707;
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
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0.2) 50%,
    transparent 100%
  );
  text-align: center;
  text-shadow: 0 16px 36px rgba(0, 0, 0, 0.68);
`;

const Content = styled.div`
  position: absolute;
  right: 0;
  bottom: 60px;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(980px, calc(100% - 36px));
  margin: 0 auto;
  text-align: center;
`;

const Eyebrow = styled.span`
  display: inline-flex;
  border: 0;
  border-radius: 0;
  background: #e4002b;
  padding: 8px 14px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 2px;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 14px 0 0;
  color: #ffffff;
  font-size: clamp(1.6rem, 3vw, 2.8rem);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 0.98;
  text-transform: uppercase;

`;

const Subtitle = styled.p`
  max-width: min(760px, 88vw);
  margin: 18px 0 0;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 900;
  line-height: 1.45;
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
  border: 1px solid #ff8a2a;
  border-radius: 999px;
  background: #ff6a00;
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

const Arrow = styled.button<{ $side: "left" | "right"; $hidden: boolean }>`
  position: absolute;
  top: 50%;
  ${({ $side }) => $side}: 24px;
  z-index: 4;
  display: ${({ $hidden }) => ($hidden ? "none" : "grid")};
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
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const [timerResetSignal, setTimerResetSignal] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const dragDeltaRef = useRef(0);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishAnimationAfterDelay = useCallback(() => {
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    animationTimerRef.current = setTimeout(() => {
      setIsAnimating(false);
      animationTimerRef.current = null;
    }, HERO_TRANSITION_MS);
  }, []);

  const goTo = useCallback(
    (index: number, dir: 1 | -1, resetTimer = true) => {
      if (slideCount < 2 || isAnimating) return;

      const nextIndex = (index + slideCount) % slideCount;
      if (nextIndex === currentIndex) return;

      setDirection(dir);
      setCurrentIndex(nextIndex);
      setIsAnimating(true);
      finishAnimationAfterDelay();
      if (resetTimer) setTimerResetSignal((signal) => signal + 1);
    },
    [currentIndex, finishAnimationAfterDelay, isAnimating, slideCount],
  );

  const next = useCallback(
    (resetTimer = true) => {
      goTo(currentIndex + 1, 1, resetTimer);
    },
    [currentIndex, goTo],
  );

  const prev = useCallback(
    (resetTimer = true) => {
      goTo(currentIndex - 1, -1, resetTimer);
    },
    [currentIndex, goTo],
  );

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setCurrentIndex((index) => Math.min(index, Math.max(slideCount - 1, 0)));
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
    dragDeltaRef.current = 0;
    setDragDelta(0);
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateDrag = (event: PointerEvent<HTMLElement>) => {
    if (!isDragging || dragStartX.current === null) return;

    const nextDelta = event.clientX - dragStartX.current;
    dragDeltaRef.current = nextDelta;
    setDragDelta(nextDelta);
  };

  const finishDrag = (event: PointerEvent<HTMLElement>) => {
    if (!isDragging) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const dragDistance = dragDeltaRef.current;
    dragStartX.current = null;
    dragDeltaRef.current = 0;
    setIsDragging(false);
    setDragDelta(0);

    if (Math.abs(dragDistance) > HERO_DRAG_THRESHOLD_PX) {
      if (dragDistance < 0) next();
      else prev();
      return;
    }

    setTimerResetSignal((signal) => signal + 1);
  };

  const trackTranslatePercent =
    slideCount > 0 ? currentIndex * (100 / slideCount) : 0;
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
        style={{
          width: `${slideCount * 100}%`,
          transform: `translateX(calc(-${trackTranslatePercent}% + ${dragDelta}px))`,
          transition: isDragging
            ? "none"
            : "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
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
            $hidden={isAnimating}
            onClick={() => prev()}
            aria-label="Slide trước"
          >
            <FaChevronLeft />
          </Arrow>
          <Arrow
            type="button"
            $side="right"
            $hidden={isAnimating}
            onClick={() => next()}
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
