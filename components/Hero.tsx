"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type FocusEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import styled, { keyframes } from "styled-components";
import { useCarouselAutoplay } from "@/hooks/useCarouselAutoplay";
import type { HomepageSlide } from "@/lib/adminHomepageSlider";
import { normalizeCatalogImage } from "@/lib/publicCatalog";

export const HERO_AUTOPLAY_INTERVAL_MS = 5000;

const progressFill = keyframes`
  from {
    transform: scaleX(0);
  }

  to {
    transform: scaleX(1);
  }
`;

const HeroShell = styled.section`
  position: relative;
  width: 100%;
  min-height: 680px;
  overflow: hidden;
  background:
    radial-gradient(circle at 78% 34%, rgba(232, 93, 0, 0.28), transparent 28%),
    radial-gradient(circle at 62% 62%, rgba(156, 29, 18, 0.22), transparent 30%),
    linear-gradient(135deg, #070707 0%, #0c0c0c 46%, #120805 100%);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px);
    background-size: 42px 42px;
    mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.35), #000 45%, rgba(0, 0, 0, 0.52));
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.05), transparent 20%),
      linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.48));
  }

  @media (max-width: 900px) {
    min-height: 780px;
  }

  @media (max-width: 640px) {
    min-height: 760px;
  }
`;

const Slide = styled.div<{ $active: boolean }>`
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transform: translateY(${({ $active }) => ($active ? "0" : "16px")});
  transition:
    opacity 0.72s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.9s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: ${({ $active }) => ($active ? "auto" : "none")};
`;

const SlideInner = styled.div`
  position: relative;
  display: block;
  width: min(100%, 1440px);
  min-height: 680px;
  margin: 0 auto;
  padding: 0;

  @media (max-width: 1180px) {
    width: 100%;
  }

  @media (max-width: 900px) {
    min-height: 780px;
  }

  @media (max-width: 640px) {
    min-height: 760px;
  }
`;

const Content = styled.div`
  position: absolute;
  bottom: 64px;
  left: 48px;
  z-index: 2;
  max-width: min(48vw, 620px);
  text-align: left;
  text-shadow: 0 18px 42px rgba(0, 0, 0, 0.72);

  @media (max-width: 900px) {
    right: 24px;
    bottom: 88px;
    left: 24px;
    max-width: 560px;
  }

  @media (max-width: 640px) {
    right: 18px;
    left: 18px;
  }
`;

const Eyebrow = styled.span`
  display: inline-flex;
  border: 1px solid rgba(232, 93, 0, 0.72);
  border-radius: 999px;
  background: rgba(7, 7, 7, 0.72);
  padding: 8px 14px;
  color: #ff7a1a;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 2px;
  text-transform: uppercase;
  backdrop-filter: blur(10px);
`;

const Title = styled.h1`
  margin: 16px 0 0;
  color: #ffffff;
  font-size: clamp(36px, 5vw, 64px);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 0.92;
  text-transform: uppercase;

  @media (max-width: 640px) {
    font-size: clamp(34px, 11vw, 46px);
  }
`;

const Subtitle = styled.p`
  max-width: 340px;
  margin: 10px 0 0;
  color: #888;
  font-size: clamp(13px, 1.3vw, 15px);
  font-weight: 700;
  line-height: 1.45;
`;

const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
`;

const PrimaryCta = styled(Link)`
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  border: 1px solid rgba(232, 93, 0, 0.88);
  border-radius: 999px;
  background: #e85d00;
  box-shadow: 0 18px 42px rgba(232, 93, 0, 0.28);
  padding: 0 24px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 1.4px;
  text-decoration: none;
  text-transform: uppercase;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: #ff6a00;
    box-shadow: 0 20px 46px rgba(232, 93, 0, 0.36);
    transform: translateY(-1px);
  }
`;

const SecondaryCta = styled(Link)`
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  padding: 0 22px;
  color: rgba(255, 255, 255, 0.86);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1.2px;
  text-decoration: none;
  text-transform: uppercase;
  backdrop-filter: blur(10px);
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: rgba(232, 93, 0, 0.72);
    color: #ff7a1a;
    transform: translateY(-1px);
  }
`;

const VisualColumn = styled.div`
  position: absolute;
  top: 50%;
  right: clamp(18px, 5vw, 72px);
  z-index: 2;
  display: grid;
  width: min(58vw, 720px);
  height: min(68vw, 620px);
  max-height: calc(100% - 112px);
  place-items: center;
  transform: translateY(-50%);

  @media (max-width: 900px) {
    top: 35%;
    right: 50%;
    width: min(88vw, 520px);
    height: 340px;
    transform: translate(50%, -50%);
  }
`;

const VisualGlow = styled.div`
  position: absolute;
  inset: -8%;
  background: radial-gradient(ellipse at 70% 50%, rgba(232, 93, 0, 0.12), transparent 55%);
`;

const VisualFrame = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

const Arrow = styled.button<{ $side: "left" | "right" }>`
  position: absolute;
  top: 50%;
  ${({ $side }) => $side}: 24px;
  z-index: 4;
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  background: rgba(7, 7, 7, 0.48);
  color: #ffffff;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transform: translateY(-50%);
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: rgba(232, 93, 0, 0.78);
    color: #e85d00;
    box-shadow: 0 0 28px rgba(232, 93, 0, 0.2);
    transform: translateY(-50%) scale(1.04);
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const ControlDock = styled.div`
  position: absolute;
  right: 0;
  bottom: 20px;
  left: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
`;

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Counter = styled.span`
  position: absolute;
  top: 20px;
  right: 24px;
  z-index: 4;
  color: #444;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.2px;
`;

const CounterActive = styled.span`
  color: #e85d00;
`;

const ProgressWrap = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 4;
  height: 2px;
  overflow: hidden;
  background: transparent;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

const ProgressFill = styled.span<{
  $durationMs: number;
  $paused: boolean;
}>`
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #e85d00, #ff9a3d);
  box-shadow: none;
  transform-origin: left center;
  animation: ${progressFill} ${({ $durationMs }) => $durationMs}ms linear forwards;
  animation-play-state: ${({ $paused }) => ($paused ? "paused" : "running")};
`;

const Dots = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
`;

const Dot = styled.button<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? "24px" : "6px")};
  height: 6px;
  border: 0;
  border-radius: 999px;
  background: ${({ $active }) =>
    $active ? "#e85d00" : "rgba(255, 255, 255, 0.34)"};
  box-shadow: ${({ $active }) =>
    $active ? "0 0 16px rgba(232, 93, 0, 0.45)" : "none"};
  padding: 0;
  cursor: pointer;
  transition:
    width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: ${({ $active }) =>
      $active ? "#ff7418" : "rgba(255, 255, 255, 0.62)"};
    transform: scale(1.16);
  }
`;

type HeroProps = {
  slides?: HomepageSlide[] | null;
};

function formatCounter(index: number) {
  return String(index + 1).padStart(2, "0");
}

function formatTotal(total: number) {
  return String(total).padStart(2, "0");
}

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
  const [active, setActive] = useState(0);
  const [isFocusPaused, setIsFocusPaused] = useState(false);
  const [autoplayResetSignal, setAutoplayResetSignal] = useState(0);
  const heroSlides = slides ?? [];

  const advance = useCallback(() => {
    setActive((index) => (index + 1) % heroSlides.length);
  }, [heroSlides.length]);

  const autoplayState = useCarouselAutoplay({
    slideCount: heroSlides.length,
    intervalMs: HERO_AUTOPLAY_INTERVAL_MS,
    isPaused: isFocusPaused,
    resetSignal: autoplayResetSignal,
    onAdvance: advance,
  });

  useEffect(() => {
    setActive((index) => Math.min(index, Math.max(heroSlides.length - 1, 0)));
  }, [heroSlides.length]);

  if (heroSlides.length === 0) return null;

  const activeSlide = heroSlides[active] ?? heroSlides[0];
  const activeText = getSlideText(activeSlide);
  const hasMultipleSlides = heroSlides.length > 1;
  const isAutoplayPaused = autoplayState.isAutoplayPaused;

  const restartAutoplayTimer = () => {
    setAutoplayResetSignal((signal) => signal + 1);
  };

  const move = (direction: number) => {
    setActive((index) => (index + direction + heroSlides.length) % heroSlides.length);
    restartAutoplayTimer();
  };

  const selectSlide = (index: number) => {
    setActive(index);
    restartAutoplayTimer();
  };

  const handleHeroBlur = (event: FocusEvent<HTMLElement>) => {
    const nextFocusedElement = event.relatedTarget;

    if (
      nextFocusedElement instanceof Node &&
      event.currentTarget.contains(nextFocusedElement)
    ) {
      return;
    }

    setIsFocusPaused(false);
  };

  return (
    <HeroShell
      aria-roledescription="carousel"
      aria-label="Slider trang chủ"
      onFocusCapture={() => setIsFocusPaused(true)}
      onBlurCapture={handleHeroBlur}
    >
      {hasMultipleSlides ? (
        <Counter aria-live="polite">
          <CounterActive>{formatCounter(active)}</CounterActive> /{" "}
          {formatTotal(heroSlides.length)}
        </Counter>
      ) : null}

      {heroSlides.map((slide, index) => {
        const slideText = index === active ? activeText : getSlideText(slide);

        return (
          <Slide
            key={slide.id}
            $active={index === active}
            aria-hidden={index !== active}
          >
            <SlideInner>
              <Content>
                <Eyebrow>{slideText.eyebrow}</Eyebrow>
                <Title>{slideText.title}</Title>
                <Subtitle>{slideText.subtitle}</Subtitle>
                <CtaRow>
                  <PrimaryCta href={slideText.primaryUrl}>
                    {slideText.primaryLabel}
                  </PrimaryCta>
                  <SecondaryCta href="/bo-suu-tap">
                    Xem bộ sưu tập
                  </SecondaryCta>
                </CtaRow>
              </Content>

              <VisualColumn>
                <VisualGlow aria-hidden="true" />
                <VisualFrame>
                  <Image
                    src={normalizeCatalogImage(slide.imageUrl)}
                    alt={slide.altText}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 900px) 90vw, 48vw"
                    style={{ objectFit: "contain" }}
                  />
                </VisualFrame>
              </VisualColumn>
            </SlideInner>
          </Slide>
        );
      })}

      {hasMultipleSlides ? (
        <>
          <Arrow
            type="button"
            $side="left"
            onClick={() => move(-1)}
            aria-label="Slide trước"
          >
            <FaChevronLeft />
          </Arrow>
          <Arrow
            type="button"
            $side="right"
            onClick={() => move(1)}
            aria-label="Slide tiếp theo"
          >
            <FaChevronRight />
          </Arrow>
          <ControlDock>
            <ControlGroup>
              <Dots>
                {heroSlides.map((slide, index) => (
                  <Dot
                    type="button"
                    key={slide.id}
                    $active={index === active}
                    onClick={() => selectSlide(index)}
                    aria-current={index === active ? "true" : undefined}
                    aria-label={`Xem slide ${index + 1}`}
                  />
                ))}
              </Dots>
            </ControlGroup>
          </ControlDock>
          <ProgressWrap aria-hidden="true">
            <ProgressFill
              key={`${active}-${autoplayResetSignal}`}
              $durationMs={HERO_AUTOPLAY_INTERVAL_MS}
              $paused={isAutoplayPaused}
            />
          </ProgressWrap>
        </>
      ) : null}
    </HeroShell>
  );
}
