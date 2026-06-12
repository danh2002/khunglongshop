import styled from "styled-components";
import ProductItem from "./ProductItem";

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 34px 20px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 28px 14px;
  }
`;

export default function FeaturedProductsGrid({ products }: { products: Product[] }) {
  return (
    <Grid>
      {products.map((product) => (
        <ProductItem key={product.id} product={product} />
      ))}
    </Grid>
  );
}
