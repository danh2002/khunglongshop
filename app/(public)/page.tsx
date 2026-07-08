import Hero from "@/components/Hero";
import ProductsSection from "@/components/ProductsSection";
import CollectorBanner from "@/components/CollectorBanner";
import FeaturedSeries from "@/components/FeaturedSeries";
import HomeMarquee from "@/components/HomeMarquee";
import NewArrivals from "@/components/NewArrivals";
import { getHomepageProducts } from "@/lib/homepage-products";
import { getActiveCmsSlides } from "@/lib/homepageSlides";
import { warnPublicDataFallback } from "@/lib/publicDataFallback";

export const revalidate = 60;

async function getHomepageSlidesSafely() {
  try {
    const slides = await getActiveCmsSlides();
    return slides.length > 0 ? slides : null;
  } catch (error) {
    warnPublicDataFallback("homepage", "CMS slider unavailable; rendering default hero.", error);
    return null;
  }
}

export default async function Home() {
  const [
    { featuredProducts, blindBoxProducts, randomKeychainSlots, hasError },
    cmsSlides,
  ] = await Promise.all([
    getHomepageProducts(),
    getHomepageSlidesSafely(),
  ]);

  return (
    <>
      <Hero
        slides={cmsSlides}
      />
      <HomeMarquee />
      <NewArrivals products={featuredProducts} />
      <FeaturedSeries slots={randomKeychainSlots} />
      <ProductsSection initialProducts={blindBoxProducts} initialError={hasError} />
      <CollectorBanner />
    </>
  );
}
