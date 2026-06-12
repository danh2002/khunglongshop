import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: Array.from(
        { length: 10 },
        (_, index) => `/product/vanie-${index + 1}`
      ),
    },
    sitemap: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/sitemap.xml`,
  };
}
