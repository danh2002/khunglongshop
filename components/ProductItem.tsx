"use client";

import Image from "next/image";
import Link from "next/link";
import { FaCartShopping, FaEye, FaHeart } from "react-icons/fa6";
import { m } from "framer-motion";
import styled from "styled-components";
import { sanitize } from "@/lib/sanitize";
import { isMerchTemplateImage, toMerchProduct } from "@/lib/merchCatalog";
import { useI18n } from "./LanguageProvider";

const ProductCard = styled(m.article)<{ $disabled: boolean }>`
  width: 100%;
  overflow: hidden;
  background: #111111;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  opacity: ${({ $disabled }) => ($disabled ? 0.58 : 1)};
  transition: border-color 220ms ease, box-shadow 220ms ease;

  &:hover {
    border-color: rgba(255, 106, 0, 0.35);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 106, 0, 0.2);
  }

  &:focus-within {
    outline: 2px solid #f47912;
    outline-offset: 4px;
  }
`;

const Media = styled.div`
  position: relative;
  height: 160px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 35%, rgba(255, 106, 0, 0.1), transparent 48%),
    #111111;

  img {
    padding: 1rem;
    transition: transform 240ms ease;
  }

  ${ProductCard}:hover & img {
    transform: scale(1.07);
  }
`;

const Badge = styled.span<{ $kind: "collector" | "new" | "sale" }>`
  position: absolute;
  top: 0.6rem;
  left: 0.6rem;
  z-index: 2;
  padding: 3px 8px;
  border-radius: 2px;
  background: ${({ $kind }) => ($kind === "collector" ? "rgba(255, 106, 0, 0.9)" : $kind === "new" ? "#22c55e" : "#e83030")};
  color: #fff;
  font-size: 0.48rem;
  font-weight: 900;
  letter-spacing: 0.04rem;
  text-transform: uppercase;
`;

const HeartButton = styled(Link)`
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  z-index: 2;
  width: 32px;
  height: 32px;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: rgba(255, 255, 255, 0.4);
  text-decoration: none;
  transition: color 160ms ease, background 160ms ease;

  &:hover {
    background: rgba(232, 93, 0, 0.16);
    color: #e85d00;
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 3px;
  }
`;

const Body = styled.div`
  padding: 0.75rem 1rem 1rem;
`;

const ProductName = styled(Link)`
  display: block;
  overflow: hidden;
  color: #fff;
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1.25;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: #ff6a00;
  }
`;

const Subtitle = styled.p`
  margin: 2px 0 0;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.65rem;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const CurrentPrice = styled.span`
  color: #ff6a00;
  font-size: 1rem;
  font-weight: 900;
`;

const OriginalPrice = styled.span`
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.75rem;
  text-decoration: line-through;
`;

const Stock = styled.div<{ $state: "in" | "low" | "out" }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.35rem;
  color: ${({ $state }) => ($state === "in" ? "#22c55e" : $state === "low" ? "#f59e0b" : "#e83030")};
  font-size: 0.65rem;
  font-weight: 700;

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
`;

const ActionRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

const AddButton = styled(Link)`
  height: 38px;
  flex: 1 1 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.7rem;
  font-weight: 800;
  text-decoration: none;
  text-transform: uppercase;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;

  &:hover {
    background: rgba(255, 106, 0, 0.15);
    border-color: rgba(255, 106, 0, 0.4);
    color: #fff;
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 3px;
  }
`;

const QuickButton = styled(Link)`
  width: 36px;
  height: 38px;
  display: inline-grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;

  &:hover {
    background: rgba(255, 106, 0, 0.15);
    border-color: rgba(255, 106, 0, 0.4);
    color: #fff;
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 3px;
  }
`;

const getStockState = (stock: number) => (stock <= 0 ? "out" : stock <= 5 ? "low" : "in");
const ProductItem = ({ product }: { product: Product; color?: string }) => {
  const { t } = useI18n();
  const displayProduct = isMerchTemplateImage(product.mainImage) ? product : toMerchProduct(product);
  const stockState = getStockState(displayProduct.inStock);
  const productHref = `/product/${displayProduct.slug}`;
  const originalPrice = Math.round(displayProduct.price * 1.12);
  const isSale = displayProduct.inStock <= 5 && displayProduct.inStock > 0 && !displayProduct.isCollector;
  const badgeKind = displayProduct.isCollector ? "collector" : isSale ? "sale" : "new";
  const badgeText = displayProduct.isCollector ? t("product.collectorSet") : isSale ? t("product.sale") : t("product.new");
  const stockText =
    displayProduct.inStock <= 0
      ? t("product.outOfStock")
      : displayProduct.inStock <= 5
        ? `${t("product.lowStock")} (${displayProduct.inStock})`
        : t("product.inStock");

  return (
    <ProductCard
      $disabled={displayProduct.inStock <= 0}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Media>
        <Badge $kind={badgeKind}>{badgeText}</Badge>
        <HeartButton href="/wishlist" aria-label={`Add ${sanitize(displayProduct.title)} to wishlist`}>
          <FaHeart />
        </HeartButton>
        <Link href={productHref} aria-label={sanitize(displayProduct.title)}>
          <Image
            src={displayProduct.mainImage ? `/${displayProduct.mainImage}` : "/product_placeholder.jpg"}
            fill
            sizes="(max-width: 768px) 50vw, 220px"
            style={{ objectFit: "contain" }}
            alt={sanitize(displayProduct.title) || "Product image"}
          />
        </Link>
      </Media>
      <Body>
        <ProductName href={productHref}>{sanitize(displayProduct.title)}</ProductName>
        <Subtitle>{sanitize(displayProduct.description || displayProduct.manufacturer || "Limited Edition")}</Subtitle>
        <PriceRow>
          <CurrentPrice>${displayProduct.price}</CurrentPrice>
          {isSale ? <OriginalPrice>${originalPrice}</OriginalPrice> : null}
        </PriceRow>
        <Stock $state={stockState}>{stockText}</Stock>
        <ActionRow>
          <AddButton href={productHref}>
            <FaCartShopping aria-hidden="true" />
            {t("product.addToCart")}
          </AddButton>
          <QuickButton href={productHref} aria-label={`${t("product.quickView")} ${sanitize(displayProduct.title)}`}>
            <FaEye />
          </QuickButton>
        </ActionRow>
      </Body>
    </ProductCard>
  );
};

export default ProductItem;
