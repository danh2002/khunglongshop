"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import styled from "styled-components";
import AddToCartSingleProductBtn from "./AddToCartSingleProductBtn";
import BuyNowSingleProductBtn from "./BuyNowSingleProductBtn";
import { formatVnd } from "@/lib/currency";
import { normalizeCatalogImage } from "@/lib/publicCatalog";
import { revealSection } from "./homeStyles";

const Section = styled.section`
  ${revealSection(100)}
  background: #070707;
  padding: 80px 24px;
`;

const Card = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 48px;
  width: min(100%, 1280px);
  margin: 0 auto;
  border: 1px solid transparent;
  border-radius: 24px;
  background:
    linear-gradient(#111111, #111111) padding-box,
    linear-gradient(135deg, #e85d00, #ff9500) border-box;
  padding: 48px;

  @media (max-width: 850px) {
    grid-template-columns: minmax(0, 1fr);
    padding: 28px;
  }
`;

const Gallery = styled.div`
  min-width: 0;
`;

const MainImage = styled.div`
  position: relative;
  width: min(100%, 360px);
  height: 360px;
  margin: 0 auto;
  filter: drop-shadow(0 18px 32px rgba(0, 0, 0, 0.5));

  @media (max-width: 500px) {
    height: 290px;
  }
`;

const Thumbnails = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
`;

const Thumbnail = styled.button<{ $active: boolean }>`
  position: relative;
  width: 60px;
  height: 60px;
  overflow: hidden;
  border: 1px solid ${({ $active }) => ($active ? "#e85d00" : "#2a2a2a")};
  border-radius: 9px;
  background: #0d0d0d;
  cursor: pointer;

  &:hover {
    border-color: #e85d00;
  }
`;

const Details = styled.div`
  min-width: 0;
`;

const DropPill = styled.span`
  display: inline-flex;
  border-radius: 999px;
  background: rgba(232, 93, 0, 0.16);
  padding: 7px 13px;
  color: #e85d00;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.5px;
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: 16px 0 0;
  color: #ffffff;
  font-size: clamp(2.6rem, 5vw, 48px);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
  text-transform: uppercase;
`;

const Subtitle = styled.p`
  margin: 9px 0 0;
  color: #e85d00;
  font-weight: 700;
`;

const Rating = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 18px;
  color: #e85d00;
  font-size: 14px;

  span {
    color: #777777;
  }
`;

const Description = styled.p`
  margin: 20px 0 0;
  color: #888888;
  line-height: 1.7;
`;

const Rarities = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
`;

const Rarity = styled.span<{ $color: string; $background: string }>`
  border-radius: 999px;
  background: ${({ $background }) => $background};
  padding: 6px 10px;
  color: ${({ $color }) => $color};
  font-size: 10px;
  font-weight: 900;
`;

const Price = styled.p`
  margin: 24px 0 0;
  color: #e85d00;
  font-size: 36px;
  font-weight: 900;
`;

const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
`;

const Trust = styled.p`
  margin: 18px 0 0;
  color: #666666;
  font-size: 12px;
`;

export default function FeaturedDrop({
  product,
  variantImages = [],
}: {
  product?: Product;
  variantImages?: string[];
}) {
  const images = useMemo(
    () =>
      product
        ? [product.mainImage, ...variantImages.filter((image) => image !== product.mainImage)].slice(0, 5)
        : [],
    [product, variantImages]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!product) return null;
  const selectedImage = images[selectedIndex] || product.mainImage;

  return (
    <Section>
      <Card>
        <Gallery>
          <MainImage>
            <Image
              src={normalizeCatalogImage(selectedImage)}
              alt={product.title}
              fill
              sizes="360px"
              style={{ objectFit: "contain" }}
            />
          </MainImage>
          <Thumbnails>
            {images.map((image, index) => (
              <Thumbnail
                type="button"
                key={`${image}-${index}`}
                $active={selectedIndex === index}
                onClick={() => setSelectedIndex(index)}
                aria-label={`Xem ảnh ${index + 1}`}
              >
                <Image
                  src={normalizeCatalogImage(image)}
                  alt=""
                  fill
                  sizes="60px"
                  style={{ objectFit: "contain", padding: "5px" }}
                />
              </Thumbnail>
            ))}
          </Thumbnails>
        </Gallery>

        <Details>
          <DropPill>New drop</DropPill>
          <Title>{product.title}</Title>
          <Subtitle>Bộ sưu tập Vanie</Subtitle>
          <Rating>
            5.0 / 5 <span>128 đánh giá</span>
          </Rating>
          <Description>
            {product.description ||
              "Blind box Vanie mang đến một trong 10 nhân vật khủng long sưu tầm với nhiều cấp độ hiếm."}
          </Description>
          <Rarities>
            <Rarity $color="#bbbbbb" $background="rgba(160,160,160,.14)">COMMON</Rarity>
            <Rarity $color="#54a7ff" $background="rgba(34,120,255,.15)">RARE</Rarity>
            <Rarity $color="#c475ff" $background="rgba(151,64,255,.15)">EPIC</Rarity>
            <Rarity $color="#ffc94d" $background="rgba(255,183,0,.16)">LEGENDARY</Rarity>
          </Rarities>
          <Price>{formatVnd(product.price)}</Price>
          <Buttons>
            <AddToCartSingleProductBtn product={product} quantityCount={1} />
            <BuyNowSingleProductBtn product={product} quantityCount={1} />
          </Buttons>
          <Trust>Thanh toán bảo mật · Giao hàng toàn quốc · Đổi trả trong 7 ngày</Trust>
        </Details>
      </Card>
    </Section>
  );
}
