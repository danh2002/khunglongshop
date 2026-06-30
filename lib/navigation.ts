import { unstable_cache } from "next/cache";
import prisma from "@/utils/db";
import { toSlug } from "@/lib/slug";

export type NavigationCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

export type NavigationCollectorSet = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

export function getCategoryNavigationSlug(name: string, slug: string | null) {
  if (slug) return toSlug(slug);
  const normalizedName = toSlug(name);
  return normalizedName === "hop-mu" ? "hop-mu" : normalizedName;
}

export function getCollectorNavigationSlug(name: string, slug: string | null) {
  if (slug) return toSlug(slug);
  const normalizedName = toSlug(name);
  return normalizedName.includes("vanie") ? "vanie" : normalizedName;
}

export const getNavigationData = unstable_cache(
  async () => {
    try {
      const [categories, collectorSets] = await Promise.all([
        prisma.category.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true, icon: true },
        }),
        prisma.collectorSet.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true, image: true },
        }),
      ]);

      return {
        categories: categories.map((category) => ({
          ...category,
          slug: getCategoryNavigationSlug(category.name, category.slug),
        })),
        collectorSets: collectorSets.map((set) => ({
          ...set,
          slug: getCollectorNavigationSlug(set.name, set.slug),
        })),
      };
    } catch (error) {
      console.error("[navigation] Failed to load navigation data", error);
      return {
        categories: [] satisfies NavigationCategory[],
        collectorSets: [] satisfies NavigationCollectorSet[],
      };
    }
  },
  ["navbar-navigation"],
  { revalidate: 300, tags: ["navbar-navigation"] }
);
