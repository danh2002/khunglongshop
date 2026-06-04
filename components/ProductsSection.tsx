import Link from "next/link";
import React from "react";
import styled, { keyframes } from "styled-components";
import ProductItem from "./ProductItem";
import apiClient from "@/lib/api";
import { toMerchProduct } from "@/lib/merchCatalog";
import { getServerTranslator } from "@/lib/i18n-server";

const Section = styled.section`
  background: #0a0a0a;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding: 0 0 3.5rem;
`;

const Inner = styled.div`
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: 0 clamp(1rem, 3vw, 2rem);
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const Title = styled.h2`
  margin: 0;
  color: #fff;
  font-size: 1.5rem;
  font-style: italic;
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;

  span {
    color: #ff6a00;
  }
`;

const ViewAll = styled(Link)`
  color: #e85d00;
  font-size: 0.82rem;
  font-weight: 900;
  text-decoration: none;
  text-transform: uppercase;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 4px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const SkeletonCard = styled.div`
  min-height: 292px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    rgba(255, 106, 0, 0.04) 25%,
    rgba(255, 106, 0, 0.08) 50%,
    rgba(255, 106, 0, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

const StatePanel = styled.div`
  grid-column: 1 / -1;
  min-height: 280px;
  display: grid;
  place-items: center;
  padding: 2rem;
  background: #111111;
  border: 1px solid rgba(255, 106, 0, 0.2);
  border-radius: 8px;
  text-align: center;
`;

const StateContent = styled.div`
  display: grid;
  justify-items: center;
  gap: 0.8rem;
`;

const StateIcon = styled.div`
  color: #ff6a00;
  font-size: 3rem;
  line-height: 1;
`;

const StateTitle = styled.h3`
  margin: 0;
  color: #fff;
  font-size: 1.4rem;
  font-style: italic;
  font-weight: 900;
  text-transform: uppercase;
`;

const StateText = styled.p`
  max-width: 420px;
  margin: 0;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.92rem;
  line-height: 1.7;
`;

const StateButton = styled(Link)`
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.4rem;
  padding: 0 1.4rem;
  background: #e85d00;
  border-radius: 4px;
  color: #fff;
  font-size: 0.82rem;
  font-style: italic;
  font-weight: 900;
  text-decoration: none;
  text-transform: uppercase;

  &:hover {
    background: #ff6a00;
  }
`;

const sortFeatured = (products: Product[]) =>
  [...products]
    .map((product, index) => toMerchProduct(product, index))
    .sort((a, b) => Number(Boolean(b.isCollector)) - Number(Boolean(a.isCollector)))
    .slice(0, 10);

const ProductsHeader = ({ title1, title2, viewAll }: { title1: string; title2: string; viewAll: string }) => (
  <HeaderRow>
    <Title>
      {title1} <span>{title2}</span>
    </Title>
    <ViewAll href="/shop">{viewAll} {"\u203A"}</ViewAll>
  </HeaderRow>
);

export const ProductsSectionSkeleton = () => {
  return (
    <Section>
      <Inner>
        <ProductsHeader title1="Sản phẩm" title2="Nổi bật" viewAll="Xem Tất Cả" />
        <Grid>
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonCard key={index} />
          ))}
        </Grid>
      </Inner>
    </Section>
  );
};

const ProductsSection = async ({
  initialProducts,
  initialError = false,
}: {
  initialProducts?: Product[];
  initialError?: boolean;
}) => {
  const { t } = await getServerTranslator();
  let products: Product[] = initialProducts ? sortFeatured(initialProducts) : [];
  let hasError = initialError;

  if (!initialProducts) {
    try {
      const data = await apiClient.get("/api/products");

      if (!data.ok) {
        console.error("Failed to fetch products:", data.statusText);
        hasError = true;
      } else {
        const result = await data.json();
        products = sortFeatured(Array.isArray(result) ? result : []);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      hasError = true;
    }
  }

  return (
    <Section>
      <Inner>
        <ProductsHeader title1={t("products.title1")} title2={t("products.title2")} viewAll={t("common.viewAll")} />
        <Grid>
          {products.length > 0 ? (
            products.map((product) => <ProductItem key={product.id} product={product} color="white" />)
          ) : hasError ? (
            <StatePanel>
              <StateContent>
                <StateIcon aria-hidden="true">{"\uD83E\uDD96"}</StateIcon>
                <StateTitle>{t("products.loadErrorTitle")}</StateTitle>
                <StateText>{t("products.loadErrorText")}</StateText>
                <StateButton href="/">{t("products.retry")}</StateButton>
              </StateContent>
            </StatePanel>
          ) : (
            <StatePanel>
              <StateContent>
                <StateIcon aria-hidden="true">{"\u25A3"}</StateIcon>
                <StateTitle>{t("products.emptyTitle")}</StateTitle>
                <StateText>{t("products.emptyText")}</StateText>
                <StateButton href="/shop">{t("products.emptyCta")}</StateButton>
              </StateContent>
            </StatePanel>
          )}
        </Grid>
      </Inner>
    </Section>
  );
};

export default ProductsSection;
