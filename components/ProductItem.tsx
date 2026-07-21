import Image from "next/image";
import Link from "next/link";
import styled, { css, keyframes } from "styled-components";
import { formatVnd } from "@/lib/currency";
import type { HomepageProduct } from "@/lib/homepage-products";
import { normalizeCatalogImage } from "@/lib/publicCatalog";
import { sanitize } from "@/lib/sanitize";
import ProductQuickAdd from "./ProductQuickAdd";

const glowPulse = keyframes`
  0%, 100% {
    box-shadow:
      0 0 0 1.5px rgba(232, 93, 0, 0.55),
      0 0 18px rgba(232, 93, 0, 0.18);
  }
  50% {
    box-shadow:
      0 0 0 1.5px rgba(255, 140, 0, 0.85),
      0 0 28px rgba(255, 140, 0, 0.3);
  }
`;

const sparkleFloat = keyframes`
  0%, 100% { opacity: 0; transform: scale(0) translateY(0); }
  50% { opacity: 1; transform: scale(1) translateY(-7px); }
`;

const Card = styled.article<{ $compact: boolean; $disabled: boolean }>`
  width: 100%;
  min-width: 0;
  opacity: ${({ $disabled }) => ($disabled ? 0.58 : 1)};
`;

const Media = styled.div`
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 16px;
  animation: ${glowPulse} 2.8s ease-in-out infinite;
  border: 1px solid transparent;
  background: linear-gradient(145deg, #1a0e06, #0f0800);

  img {
    padding: 18px;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  ${Card}:hover & img {
    transform: scale(1.08);
  }

  .product-quick-add {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 2;
    height: 44px;
    border: 0;
    background: rgba(232, 93, 0, 0.95);
    color: #ffffff;
    cursor: pointer;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    transform: translateY(100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  ${Card}:hover & .product-quick-add,
  .product-quick-add:focus-visible {
    transform: translateY(0);
  }

  .product-quick-add:disabled {
    cursor: not-allowed;
    background: #333333;
  }

  @media (hover: none) {
    .product-quick-add {
      position: relative;
      transform: none;
    }
  }
`;

const CardBadge = styled.span<{ $type: "new" | "hot" }>`
  position: absolute;
  top: 9px;
  left: 9px;
  z-index: 10;
  padding: 2px 7px;
  border-radius: 4px;
  background: ${({ $type }) => ($type === "hot" ? "#e85d00" : "#17d6c5")};
  color: #ffffff;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
`;

const CardPlatform = styled.div`
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(232, 93, 0, 0.7) 0%,
    rgba(232, 93, 0, 0) 70%
  );
  filter: blur(6px);
  pointer-events: none;
  z-index: 1;
`;

const CardSparkle = styled.span<{ $i: number }>`
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #ffb23f;
  pointer-events: none;
  z-index: 3;
  top: ${({ $i }) => [10, 20, 65, 75, 6, 52][$i % 6]}%;
  left: ${({ $i }) => [7, 76, 3, 81, 46, 86][$i % 6]}%;
  opacity: 0;
  animation: ${sparkleFloat} ${({ $i }) => 1.4 + ($i % 3) * 0.6}s ease-in-out infinite;
  animation-delay: ${({ $i }) => $i * 0.28}s;
`;

const ImageLink = styled(Link)`
  position: absolute;
  inset: 0;
`;

const Name = styled(Link)`
  display: -webkit-box;
  min-height: 36px;
  margin-top: 12px;
  overflow: hidden;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  text-decoration: none;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;

  &:hover {
    color: #e85d00;
  }
`;

const Price = styled.div`
  margin-top: 5px;
  color: #e85d00;
  font-size: 15px;
  font-weight: 700;
`;

const Stock = styled.div<{ $available: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  color: ${({ $available }) => ($available ? "#828282" : "#a94a4a")};
  font-size: 11px;

  &::before {
    content: "";
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${({ $available }) => ($available ? "#00a95c" : "#cc0000")};
  }
`;

export default function ProductItem({
  product,
  compact = false,
  viewOnly = false,
  imagePriority = false,
}: {
  product: HomepageProduct;
  compact?: boolean;
  color?: string;
  viewOnly?: boolean;
  imagePriority?: boolean;
}) {
  const href = `/product/${product.slug}`;
  const available = viewOnly || product.inStock > 0;

  return (
    <Card $compact={compact} $disabled={!available}>
      <Media>
        <CardBadge $type={imagePriority ? "new" : "hot"}>
          {imagePriority ? "NEW" : "HOT"}
        </CardBadge>
        {[0, 1, 2, 3].map((i) => (
          <CardSparkle key={i} $i={i} />
        ))}
        <ImageLink href={href} aria-label={sanitize(product.title)}>
          <Image
            src={normalizeCatalogImage(product.mainImage)}
            alt={sanitize(product.title) || "Hình ảnh sản phẩm"}
            fill
            sizes={compact ? "220px" : "(max-width: 768px) 50vw, 25vw"}
            priority={imagePriority}
            loading={imagePriority ? "eager" : "lazy"}
            fetchPriority={imagePriority ? "high" : "auto"}
            style={{ objectFit: "contain" }}
          />
        </ImageLink>
        {!viewOnly ? (
          <ProductQuickAdd
            available={available}
            product={{
              id: product.id,
              title: product.title,
              price: product.price,
              image: product.mainImage,
              slug: product.slug,
            }}
          />
        ) : null}
        <CardPlatform />
      </Media>
      <Name href={href}>{sanitize(product.title)}</Name>
      {!viewOnly ? (
        <>
          <Price>{formatVnd(product.price)}</Price>
          <Stock $available={available}>{available ? "Còn hàng" : "Hết hàng"}</Stock>
        </>
      ) : null}
    </Card>
  );
}
