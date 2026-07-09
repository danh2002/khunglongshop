import Image from "next/image";
import Link from "next/link";
import styled from "styled-components";
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

const Slot = styled.div<{ $revealed: boolean }>`
  position: relative;
  display: grid;
  aspect-ratio: 1;
  place-items: center;
  overflow: hidden;
  border: 1px solid ${({ $revealed }) => ($revealed ? "rgba(232, 93, 0, 0.5)" : "#1e1e1e")};
  border-radius: 12px;
  background: ${({ $revealed }) => ($revealed ? "#14100d" : "#111111")};
  color: #3a3a3a;
  font-size: 24px;
  font-weight: 700;
  transition: border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: #e85d00;
  }

  img {
    padding: 8px;
  }
`;

const LockedMark = styled.span`
  color: rgba(255, 255, 255, 0.18);
  font-size: clamp(28px, 5vw, 46px);
  font-weight: 900;
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
              <Slot key={product?.id ?? `locked-${index}`} $revealed={Boolean(product)}>
                {product ? (
                  <Image
                    src={normalizeCatalogImage(product.mainImage)}
                    alt={product.title}
                    fill
                    sizes="120px"
                    style={{ objectFit: "contain" }}
                  />
                ) : (
                  <LockedMark aria-label="Nhân vật bí mật">?</LockedMark>
                )}
              </Slot>
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
