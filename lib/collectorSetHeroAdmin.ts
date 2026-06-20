import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

export const collectorSetHeroFieldSchemas = {
  heroImage: optionalText(500),
  heroBadge: optionalText(80),
  heroTitle: optionalText(180),
  heroSubtitle: optionalText(300),
  heroPrimaryCtaLabel: optionalText(80),
  heroPrimaryCtaUrl: optionalText(500),
  heroSecondaryCtaLabel: optionalText(80),
  heroSecondaryCtaUrl: optionalText(500),
  showHero: z.boolean().optional(),
};

export type CollectorSetHeroInput = z.infer<z.ZodObject<typeof collectorSetHeroFieldSchemas>>;

type RefinementContext = z.RefinementCtx;

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function validateInternalPath(value: string | null | undefined) {
  if (!hasValue(value)) return true;
  const path = value?.trim() ?? "";
  return path.startsWith("/") && !path.startsWith("//") && !/^https?:\/\//i.test(path) && !/^javascript:/i.test(path);
}

function validateCtaPair(
  data: CollectorSetHeroInput,
  ctx: RefinementContext,
  labelKey: "heroPrimaryCtaLabel" | "heroSecondaryCtaLabel",
  urlKey: "heroPrimaryCtaUrl" | "heroSecondaryCtaUrl"
) {
  const hasLabel = hasValue(data[labelKey]);
  const hasUrl = hasValue(data[urlKey]);

  if (hasLabel !== hasUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [hasLabel ? urlKey : labelKey],
      message: "CTA label and URL must be provided together.",
    });
  }

  if (!validateInternalPath(data[urlKey])) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [urlKey],
      message: "CTA URL must be an internal path.",
    });
  }
}

export function validateCollectorSetHeroFields(data: CollectorSetHeroInput, ctx: RefinementContext) {
  validateCtaPair(data, ctx, "heroPrimaryCtaLabel", "heroPrimaryCtaUrl");
  validateCtaPair(data, ctx, "heroSecondaryCtaLabel", "heroSecondaryCtaUrl");
}

function normalizeOptionalText(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return value?.trim() || null;
}

export function normalizeCollectorSetHeroData(data: CollectorSetHeroInput) {
  return {
    ...(data.heroImage !== undefined ? { heroImage: normalizeOptionalText(data.heroImage) } : {}),
    ...(data.heroBadge !== undefined ? { heroBadge: normalizeOptionalText(data.heroBadge) } : {}),
    ...(data.heroTitle !== undefined ? { heroTitle: normalizeOptionalText(data.heroTitle) } : {}),
    ...(data.heroSubtitle !== undefined
      ? { heroSubtitle: normalizeOptionalText(data.heroSubtitle) }
      : {}),
    ...(data.heroPrimaryCtaLabel !== undefined
      ? { heroPrimaryCtaLabel: normalizeOptionalText(data.heroPrimaryCtaLabel) }
      : {}),
    ...(data.heroPrimaryCtaUrl !== undefined
      ? { heroPrimaryCtaUrl: normalizeOptionalText(data.heroPrimaryCtaUrl) }
      : {}),
    ...(data.heroSecondaryCtaLabel !== undefined
      ? { heroSecondaryCtaLabel: normalizeOptionalText(data.heroSecondaryCtaLabel) }
      : {}),
    ...(data.heroSecondaryCtaUrl !== undefined
      ? { heroSecondaryCtaUrl: normalizeOptionalText(data.heroSecondaryCtaUrl) }
      : {}),
    ...(data.showHero !== undefined ? { showHero: data.showHero } : {}),
  };
}
