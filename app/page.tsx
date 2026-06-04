import { CategoryMenu, Hero, ProductsSection } from "@/components";
import { fallbackMerchProducts } from "@/lib/merchCatalog";

const getHomepageProducts = async () => {
  return { products: fallbackMerchProducts, hasError: false };
};

export default async function Home() {
  const { products, hasError } = await getHomepageProducts();

  return (
    <>
      <Hero products={products} />
      <CategoryMenu />
      <ProductsSection initialProducts={products} initialError={hasError} />
    </>
  );
}
