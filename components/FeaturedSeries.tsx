import Image from "next/image";
import Link from "next/link";
import styled, { css, keyframes } from "styled-components";
import type { HomepageProduct } from "@/lib/homepage-products";
import { normalizeCatalogImage } from "@/lib/publicCatalog";
import { revealSection } from "./homeStyles";

const Section = styled.section`
  ${revealSection(140)}
  background: #070707;
  padding: 0 48px 80px;

  @media (max-width: 768px) {
    padding: 0 24px 64px;
  }
`;

const Series = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  width: min(100%, 1440px);
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid #1e1e1e;
  border-radius: 24px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Cover = styled.div`
  position: relative;
  display: flex;
  min-height: 520px;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 24%, rgba(232, 93, 0, 0.32), transparent 34%),
    linear-gradient(135deg, #1a0800, #0f0f0f);
  padding: 48px;

  @media (max-width: 768px) {
    min-height: 420px;
    padding: 32px 24px;
  }
`;

const BagImage = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const CoverText = styled.div`
  position: relative;
  z-index: 2;
`;

const Title = styled.h2`
  margin: 0;
  color: #ffffff;
  font-size: clamp(32px, 4vw, 48px);
  font-weight: 900;
  letter-spacing: -0.03em;
  text-transform: uppercase;
`;

const Meta = styled.p`
  margin: 8px 0 0;
  color: #888888;
  font-size: 14px;
`;

const Explore = styled(Link)`
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  margin-top: 20px;
  border: 1px solid #e85d00;
  border-radius: 6px;
  padding: 0 18px;
  color: #e85d00;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1px;
  text-decoration: none;
  text-transform: uppercase;

  &:hover {
    background: #e85d00;
    color: #ffffff;
  }
`;

const CharacterPanel = styled.div`
  display: grid;
  align-content: center;
  background: #0d0d0d;
  padding: 32px;
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 520px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const glowPulse = keyframes`
  0%, 100% {
    box-shadow:
      0 0 0 1.5px rgba(232, 93, 0, 0.6),
      0 0 20px rgba(232, 93, 0, 0.2);
  }
  50% {
    box-shadow:
      0 0 0 1.5px rgba(255, 140, 0, 0.9),
      0 0 32px rgba(255, 140, 0, 0.35);
  }
`;

const sparkleFloat = keyframes`
  0%, 100% { opacity: 0; transform: scale(0) translateY(0); }
  50% { opacity: 1; transform: scale(1) translateY(-6px); }
`;

const SlotWrapper = styled.div`
  position: relative;
`;

const Slot = styled.div<{ $revealed: boolean }>`
  position: relative;
  display: grid;
  aspect-ratio: 1;
  place-items: center;
  overflow: hidden;
  border-radius: 16px;
  background: ${({ $revealed }) =>
    $revealed
      ? "linear-gradient(145deg, #1a0e06, #0f0800)"
      : "#111111"};
  border: 1px solid ${({ $revealed }) =>
    $revealed ? "transparent" : "#1e1e1e"};
  box-shadow: ${({ $revealed }) =>
    $revealed
      ? "0 0 0 1.5px rgba(232,93,0,0.6), 0 0 20px rgba(232,93,0,0.15)"
      : "none"};
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  animation: ${({ $revealed }) =>
    $revealed
      ? css`${glowPulse} 2.5s ease-in-out infinite`
      : "none"};

  &:hover {
    transform: ${({ $revealed }) => ($revealed ? "translateY(-4px) scale(1.03)" : "none")};
    box-shadow: ${({ $revealed }) =>
      $revealed
        ? "0 0 0 1.5px rgba(232,93,0,0.9), 0 8px 32px rgba(232,93,0,0.4)"
        : "none"};
  }

  img {
    padding: 8px;
    filter: ${({ $revealed }) =>
      $revealed ? "drop-shadow(0 4px 12px rgba(232,93,0,0.45))" : "none"};
  }
`;

const LockedMark = styled.span`
  color: rgba(255, 255, 255, 0.18);
  font-size: clamp(28px, 5vw, 46px);
  font-weight: 900;
`;

const SlotBadge = styled.span<{ $type: "new" | "hot" }>`
  position: absolute;
  top: 7px;
  left: 7px;
  z-index: 10;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${({ $type }) => ($type === "hot" ? "#e85d00" : "#17d6c5")};
  color: #ffffff;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
`;

const Platform = styled.div`
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(232, 93, 0, 0.8) 0%,
    rgba(232, 93, 0, 0) 70%
  );
  filter: blur(8px);
  pointer-events: none;
  z-index: 0;
`;

const Sparkle = styled.span<{ $i: number }>`
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ffb23f;
  pointer-events: none;
  top: ${({ $i }) => [12, 22, 68, 78, 8, 55][$i % 6]}%;
  left: ${({ $i }) => [8, 78, 4, 83, 48, 88][$i % 6]}%;
  opacity: 0;
  animation: ${sparkleFloat} ${({ $i }) => 1.4 + ($i % 3) * 0.6}s ease-in-out infinite;
  animation-delay: ${({ $i }) => $i * 0.25}s;
`;

const SeriesNote = styled.div`
  margin-top: 20px;
  border: 1px solid #1e1e1e;
  border-radius: 8px;
  background: #111111;
  padding: 14px;
  color: #888888;
  font-size: 12px;
  text-align: center;
`;

export default function FeaturedSeries({
  slots,
}: {
  slots: Array<HomepageProduct | null>;
}) {
  if (!slots.some(Boolean)) return null;

  return (
    <Section>
      <Series>
        <Cover>
          <BagImage aria-hidden>
            <Image
              src="/tui-mu-random.png"
              alt="Túi mù random"
              width={280}
              height={380}
              style={{ objectFit: "contain", filter: "drop-shadow(0 12px 32px rgba(232,93,0,0.35))" }}
              priority
            />
          </BagImage>
          <CoverText>
            <Title>Túi mù random</Title>
            <Meta>Túi mù random các nhân vật collector nổi bật</Meta>
            <Explore href="/account/collection" prefetch={false}>
              Khám phá
            </Explore>
          </CoverText>
        </Cover>

        <CharacterPanel>
          <CharacterGrid>
            {slots.map((product, index) => (
              <SlotWrapper key={product?.id ?? `locked-${index}`}>
                <Slot $revealed={Boolean(product)}>
                  {product ? (
                    <>
                      <SlotBadge $type={index % 2 === 0 ? "new" : "hot"}>
                        {index % 2 === 0 ? "NEW" : "HOT"}
                      </SlotBadge>
                      {[0, 1, 2, 3].map((i) => (
                        <Sparkle key={i} $i={i + index} />
                      ))}
                      <Image
                        src={normalizeCatalogImage(product.mainImage)}
                        alt={product.title}
                        fill
                        sizes="120px"
                        style={{ objectFit: "contain" }}
                      />
                    </>
                  ) : (
                    <LockedMark aria-label="Nhân vật bí mật">?</LockedMark>
                  )}
                </Slot>
                {product ? <Platform /> : null}
              </SlotWrapper>
            ))}
          </CharacterGrid>
          <SeriesNote>
            Mỗi túi mù là một cơ hội mở khóa nhân vật collector bất ngờ.
          </SeriesNote>
        </CharacterPanel>
      </Series>
    </Section>
  );
}
