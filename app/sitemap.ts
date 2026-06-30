import type { MetadataRoute } from "next";
import { PUBLIC_STOREFRONT_PRODUCT_WHERE } from "@/lib/publicCatalog";
import prisma from "@/utils/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const products = await prisma.product.findMany({
    where: PUBLIC_STOREFRONT_PRODUCT_WHERE,
    select: { slug: true },
  }).catch((error) => {
    console.error("[sitemap] Failed to load product URLs", error);
    return [];
  });

  return [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/shop`, changeFrequency: "weekly", priority: 0.9 },
    ...products.map((product) => ({
      url: `${baseUrl}/product/${product.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
