import Link from "next/link";
import styled from "styled-components";
import type { HomepageProduct } from "@/lib/homepage-products";
import ProductItem from "./ProductItem";
import { revealSection } from "./homeStyles";

const Section = styled.section`
  ${revealSection(80)}
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
  margin-bottom: 24px;
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

const Row = styled.div`
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 12px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  > article {
    flex: 0 0 220px;
    scroll-snap-align: start;
  }
`;

export default function NewArrivals({ products }: { products: HomepageProduct[] }) {
  if (products.length === 0) return null;
  const featuredProducts = products.slice(0, 6);

  return (
    <Section>
      <Inner>
        <Header>
          <Title>Sản phẩm nổi bật</Title>
          <ViewAll href="/account/collection">Xem tất cả</ViewAll>
        </Header>
        <Row>
          {featuredProducts.map((product) => (
            <ProductItem key={product.id} product={product} compact viewOnly />
          ))}
        </Row>
      </Inner>
    </Section>
  );
}
