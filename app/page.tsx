import { Hero, ProductsSection } from "@/components";
import CollectorBanner from "@/components/CollectorBanner";
import FeaturedSeries from "@/components/FeaturedSeries";
import HomeMarquee from "@/components/HomeMarquee";
import NewArrivals from "@/components/NewArrivals";
import { getHomepageProducts } from "@/lib/homepage-products";
import { getActiveCmsSlides } from "@/lib/homepageSlides";

export const revalidate = 60;

async function getHomepageSlidesSafely() {
  try {
    const slides = await getActiveCmsSlides();
    return slides.length > 0 ? slides : null;
  } catch (error) {
    console.error("[homepage] Failed to load CMS slider slides:", error);
    return null;
  }
}

export default async function Home() {
  const [{ products, variantImages, hasError }, cmsSlides] = await Promise.all([
    getHomepageProducts(),
    getHomepageSlidesSafely(),
  ]);

  return (
    <>
      <Hero
        slides={cmsSlides}
      />
      <HomeMarquee />
      <NewArrivals products={products} />
      <FeaturedSeries product={products[0]} images={variantImages} />
      <ProductsSection initialProducts={products} initialError={hasError} />
      <CollectorBanner />
    </>
  );
}
