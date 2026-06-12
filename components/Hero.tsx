"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import styled from "styled-components";
import { normalizeCatalogImage } from "@/lib/publicCatalog";

const HeroShell = styled.section`
  position: relative;
  width: 100%;
  height: 85vh;
  min-height: 620px;
  overflow: hidden;
  background: #090909;

  @media (max-width: 768px) {
    height: 76vh;
    min-height: 570px;
  }
`;

const Slide = styled.div<{ $active: boolean }>`
  position: absolute;
  inset: 0;
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transform: scale(${({ $active }) => ($active ? 1 : 1.025)});
  transition:
    opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1),
    transform 1.2s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: ${({ $active }) => ($active ? "auto" : "none")};
`;

const ImageLayer = styled.div`
  position: absolute;
  inset: 0;

  img {
    padding: clamp(40px, 7vw, 100px);
  }
`;

const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 68% 40%, rgba(232, 93, 0, 0.16), transparent 28%),
    linear-gradient(90deg, rgba(7, 7, 7, 0.62), transparent 56%),
    linear-gradient(transparent 40%, rgba(7, 7, 7, 0.95) 100%);
`;

const Content = styled.div`
  position: absolute;
  bottom: 48px;
  left: max(48px, calc((100vw - 1440px) / 2 + 48px));
  z-index: 2;
  max-width: 690px;

  @media (max-width: 768px) {
    right: 24px;
    bottom: 42px;
    left: 24px;
  }
`;

const Eyebrow = styled.span`
  display: inline-flex;
  border: 1px solid rgba(232, 93, 0, 0.65);
  border-radius: 999px;
  background: rgba(7, 7, 7, 0.64);
  padding: 7px 13px;
  color: #e85d00;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 18px 0 0;
  color: #ffffff;
  font-size: clamp(42px, 6vw, 76px);
  font-weight: 900;
  letter-spacing: -0.035em;
  line-height: 0.95;
  text-transform: uppercase;
`;

const Subtitle = styled.p`
  margin: 14px 0 0;
  color: #b5b5b5;
  font-size: clamp(14px, 1.4vw, 17px);
  line-height: 1.7;
`;

const Cta = styled(Link)`
  display: inline-flex;
  min-height: 46px;
  align-items: center;
  margin-top: 24px;
  border-radius: 6px;
  background: #e85d00;
  padding: 0 24px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1px;
  text-decoration: none;
  text-transform: uppercase;

  &:hover {
    background: #ff6a00;
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
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  background: rgba(7, 7, 7, 0.52);
  color: #ffffff;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transform: translateY(-50%);

  &:hover {
    border-color: #e85d00;
    color: #e85d00;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const Dots = styled.div`
  position: absolute;
  right: 0;
  bottom: 26px;
  left: 0;
  z-index: 4;
  display: flex;
  justify-content: center;
  gap: 8px;
`;

const Dot = styled.button<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? "24px" : "6px")};
  height: 6px;
  border: 0;
  border-radius: 4px;
  background: ${({ $active }) => ($active ? "#e85d00" : "#555555")};
  padding: 0;
  cursor: pointer;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
`;

export default function Hero({
  products = [],
  variantImages = [],
}: {
  products?: Product[];
  variantImages?: string[];
}) {
  const featured = products[0];
  const slides = useMemo(
    () =>
      featured
        ? [featured.mainImage, ...variantImages.filter((image) => image !== featured.mainImage)].slice(0, 5)
        : [],
    [featured, variantImages]
  );
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!featured || slides.length === 0) return null;

  const move = (direction: number) => {
    setActive((index) => (index + direction + slides.length) % slides.length);
  };

  return (
    <HeroShell aria-roledescription="carousel" aria-label="Sản phẩm nổi bật">
      {slides.map((image, index) => (
        <Slide key={`${image}-${index}`} $active={index === active} aria-hidden={index !== active}>
          <ImageLayer>
            <Image
              src={normalizeCatalogImage(image)}
              alt={index === 0 ? featured.title : `${featured.title} - mẫu ${index + 1}`}
              fill
              priority={index === 0}
              sizes="100vw"
              style={{ objectFit: "contain" }}
            />
          </ImageLayer>
          <Backdrop />
        </Slide>
      ))}

      <Content>
        <Eyebrow>Ra mắt 2025</Eyebrow>
        <Title>{featured.title}</Title>
        <Subtitle>Bộ sưu tập 10 nhân vật, một mẫu ngẫu nhiên trong mỗi hộp.</Subtitle>
        <Cta href={`/product/${featured.slug}`}>Mua ngay</Cta>
      </Content>

      {slides.length > 1 ? (
        <>
          <Arrow type="button" $side="left" onClick={() => move(-1)} aria-label="Slide trước">
            <FaChevronLeft />
          </Arrow>
          <Arrow type="button" $side="right" onClick={() => move(1)} aria-label="Slide tiếp theo">
            <FaChevronRight />
          </Arrow>
          <Dots>
            {slides.map((_, index) => (
              <Dot
                type="button"
                key={index}
                $active={index === active}
                onClick={() => setActive(index)}
                aria-label={`Xem slide ${index + 1}`}
              />
            ))}
          </Dots>
        </>
      ) : null}
    </HeroShell>
  );
}
