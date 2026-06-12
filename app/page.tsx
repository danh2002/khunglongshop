import { Hero, ProductsSection } from "@/components";
import CollectorBanner from "@/components/CollectorBanner";
import FeaturedSeries from "@/components/FeaturedSeries";
import HomeMarquee from "@/components/HomeMarquee";
import NewArrivals from "@/components/NewArrivals";
import { getHomepageProducts } from "@/lib/homepage-products";

export const revalidate = 60;

export default async function Home() {
  const { products, variantImages, hasError } = await getHomepageProducts();

  return (
    <>
      <Hero products={products} variantImages={variantImages} />
      <HomeMarquee />
      <NewArrivals products={products} />
      <FeaturedSeries product={products[0]} images={variantImages} />
      <ProductsSection initialProducts={products} initialError={hasError} />
      <CollectorBanner />
    </>
  );
}
