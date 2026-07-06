import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("character collection hero wiring", () => {
  const pageSource = fs.readFileSync(
    path.join(process.cwd(), "app", "(public)", "bo-suu-tap", "page.tsx"),
    "utf8",
  );
  const resolverSource = fs.readFileSync(
    path.join(process.cwd(), "lib", "collectorSetHero.ts"),
    "utf8",
  );

  it("uses the generic collector set hero resolver instead of Ricon hardcoding", () => {
    expect(pageSource).toContain("getCollectorSetHero(params.nhanvat)");
    expect(pageSource).not.toContain("RICON_HERO_FALLBACK_BANNER");
    expect(pageSource).not.toContain("getRiconHeroImages");
    expect(pageSource).not.toContain('characterSlug !== "ricon"');
    expect(pageSource).not.toContain("BST RICON");
  });

  it("keeps the full-width premium overlay hero treatment", () => {
    expect(pageSource).toContain("h-[420px]");
    expect(pageSource).toContain("md:h-[580px]");
    expect(pageSource).toContain("w-full overflow-hidden");
    expect(pageSource).toContain("fill");
    expect(pageSource).toContain('sizes="100vw"');
    expect(pageSource).toContain('objectFit: "cover"');
    expect(pageSource).toContain("linear-gradient(90deg");
    expect(pageSource).toContain("items-start self-center text-left");
    expect(pageSource).toContain("border-l-2 border-[#e85d00] pl-2");
    expect(pageSource).toContain("rounded-[2px]");
  });

  it("resolves CMS fields before fallback image and copy", () => {
    expect(resolverSource).toContain("collectorSet.heroImage");
    expect(resolverSource).toContain("collectorSet.image");
    expect(resolverSource).toContain("collectorSet.products[0]?.mainImage");
    expect(resolverSource).toContain("heroBadge");
    expect(resolverSource).toContain("heroTitle");
    expect(resolverSource).toContain("heroSubtitle");
  });
});
