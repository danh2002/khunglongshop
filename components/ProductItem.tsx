import Image from "next/image";
import Link from "next/link";
import styled from "styled-components";
import { formatVnd } from "@/lib/currency";
import type { HomepageProduct } from "@/lib/homepage-products";
import { normalizeCatalogImage } from "@/lib/publicCatalog";
import { sanitize } from "@/lib/sanitize";
import ProductQuickAdd from "./ProductQuickAdd";

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
  background: #111111;

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
