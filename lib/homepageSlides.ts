import {
  getHomepageSliderModel,
  toHomepageSlide,
  type HomepageSlide,
  type HomepageSliderPrismaClient,
} from "@/lib/adminHomepageSlider";
import { warnPublicDataFallback } from "@/lib/publicDataFallback";
import prisma from "@/utils/db";

export const HOMEPAGE_SLIDE_LIMIT = 10;

export async function getActiveCmsSlides(
  client: unknown = prisma
): Promise<HomepageSlide[]> {
  try {
    const slides = await getHomepageSliderModel(
      client as HomepageSliderPrismaClient
    ).findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      take: HOMEPAGE_SLIDE_LIMIT,
    });

    return slides.map(toHomepageSlide);
  } catch (error) {
    warnPublicDataFallback("homepage", "CMS slider unavailable; rendering default hero.", error);
    return [];
  }
}
