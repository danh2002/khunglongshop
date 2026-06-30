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
  grid-template-columns: 1fr 1fr;
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
  min-height: 560px;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  background: linear-gradient(135deg, #1a0800, #0f0f0f);
  padding: 48px;

  @media (max-width: 768px) {
    min-height: 480px;
    padding: 32px 24px;
  }
`;

const CoverImage = styled.div`
  position: absolute;
  inset: 20px 20px 140px;
  filter: drop-shadow(0 18px 36px rgba(0, 0, 0, 0.55));
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
`;

const Slot = styled.div<{ $revealed: boolean }>`
  position: relative;
  display: grid;
  aspect-ratio: 1;
  place-items: center;
  overflow: hidden;
  border: 1px solid #1e1e1e;
  border-radius: 12px;
  background: #111111;
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
  product,
  images,
}: {
  product?: HomepageProduct;
  images: string[];
}) {
  if (!product) return null;
  const characterImages = images.slice(0, 3);

  return (
    <Section>
      <Series>
        <Cover>
          <CoverImage>
            <Image
              src={normalizeCatalogImage(product.mainImage)}
              alt={product.title}
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
              style={{ objectFit: "contain" }}
            />
          </CoverImage>
          <CoverText>
            <Title>Vanie Series</Title>
            <Meta>10 nhân vật · 1 phiên bản hiếm</Meta>
            <Explore href="/account/collection" prefetch={false}>Khám phá</Explore>
          </CoverText>
        </Cover>

        <CharacterPanel>
          <CharacterGrid>
            {Array.from({ length: 10 }, (_, index) => {
              const image = characterImages[index];
              return (
                <Slot key={index} $revealed={Boolean(image)}>
                  {image ? (
                    <Image
                      src={normalizeCatalogImage(image)}
                      alt={`Nhân vật Vanie ${index + 1}`}
                      fill
                      sizes="120px"
                      style={{ objectFit: "contain" }}
                    />
                  ) : (
                    <span aria-label="Nhân vật chưa mở khóa">?</span>
                  )}
                </Slot>
              );
            })}
          </CharacterGrid>
          <SeriesNote>Sưu tập đủ 10 nhân vật để mở phần thưởng trong game</SeriesNote>
        </CharacterPanel>
      </Series>
    </Section>
  );
}
