import Link from "next/link";
import styled from "styled-components";
import type { HomepageProduct } from "@/lib/homepage-products";
import FeaturedProductsGrid from "./FeaturedProductsGrid";
import { revealSection } from "./homeStyles";

const Section = styled.section`
  ${revealSection(200)}
  background: #070707;
  padding: 80px 48px;

  @media (max-width: 768px) {
    padding: 64px 24px;
  }
`;

const Inner = styled.div`
  width: min(100%, 1440px);
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
  border-bottom: 1px solid #1a1a1a;
  padding-bottom: 16px;
`;

const Title = styled.h2`
  margin: 0;
  color: #ffffff;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 2px;
  text-transform: uppercase;
`;

const ViewAll = styled(Link)`
  color: #999999;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  text-decoration: none;
  text-transform: uppercase;

  &:hover {
    color: #e85d00;
  }
`;

const State = styled.div`
  min-height: 240px;
  display: grid;
  place-items: center;
  border: 1px solid #1a1a1a;
  border-radius: 16px;
  color: #777777;
  text-align: center;
`;

const limitBlindBoxes = (products: HomepageProduct[]) => products.slice(0, 12);

export const ProductsSectionSkeleton = () => null;

export default function ProductsSection({
  initialProducts,
  initialError = false,
}: {
  initialProducts: HomepageProduct[];
  initialError?: boolean;
}) {
  const products = limitBlindBoxes(initialProducts);

  return (
    <Section>
      <Inner>
        <Header>
          <Title>Blind Box</Title>
          <ViewAll href="/shop">Xem tất cả</ViewAll>
        </Header>
        {products.length > 0 ? (
          <FeaturedProductsGrid products={products} />
        ) : (
          <State>{initialError ? "Không thể tải sản phẩm lúc này." : "Chưa có sản phẩm để hiển thị."}</State>
        )}
      </Inner>
    </Section>
  );
}
