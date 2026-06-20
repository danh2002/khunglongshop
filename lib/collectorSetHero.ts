import { normalizeCatalogImage } from "@/lib/publicCatalog";
import prisma from "@/utils/db";

export type CollectorSetHeroCta = {
  label: string;
  href: string;
};

export type CollectorSetHero = {
  image: string;
  badge: string;
  title: string;
  subtitle: string | null;
  primaryCta: CollectorSetHeroCta | null;
  secondaryCta: CollectorSetHeroCta | null;
};

function clean(value: string | null | undefined) {
  return value?.trim() || null;
}

function buildCta(
  label: string | null | undefined,
  href: string | null | undefined
): CollectorSetHeroCta | null {
  const ctaLabel = clean(label);
  const ctaHref = clean(href);
  return ctaLabel && ctaHref ? { label: ctaLabel, href: ctaHref } : null;
}

export async function getCollectorSetHero(
  characterSlug: string | null | undefined
): Promise<CollectorSetHero | null> {
  const slug = characterSlug?.trim();
  if (!slug || slug === "all") return null;

  const collectorSet = await prisma.collectorSet.findFirst({
    where: { OR: [{ slug }, { name: slug }] },
    select: {
      name: true,
      image: true,
      description: true,
      heroImage: true,
      heroBadge: true,
      heroTitle: true,
      heroSubtitle: true,
      heroPrimaryCtaLabel: true,
      heroPrimaryCtaUrl: true,
      heroSecondaryCtaLabel: true,
      heroSecondaryCtaUrl: true,
      showHero: true,
      products: {
        where: { isCollector: true, setSlotNumber: { not: null } },
        orderBy: { setSlotNumber: "asc" },
        take: 1,
        select: { mainImage: true },
      },
    },
  });

  if (!collectorSet || !collectorSet.showHero) return null;

  const rawImage =
    clean(collectorSet.heroImage) ??
    clean(collectorSet.image) ??
    clean(collectorSet.products[0]?.mainImage);

  if (!rawImage) return null;

  return {
    image: normalizeCatalogImage(rawImage),
    badge: clean(collectorSet.heroBadge) ?? collectorSet.name,
    title: clean(collectorSet.heroTitle) ?? collectorSet.name,
    subtitle: clean(collectorSet.heroSubtitle) ?? clean(collectorSet.description),
    primaryCta: buildCta(collectorSet.heroPrimaryCtaLabel, collectorSet.heroPrimaryCtaUrl),
    secondaryCta: buildCta(collectorSet.heroSecondaryCtaLabel, collectorSet.heroSecondaryCtaUrl),
  };
}
