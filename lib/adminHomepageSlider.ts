import { z } from "zod";

export type HomepageSlide = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  altText: string;
  sortOrder: number;
  isActive: boolean;
};

export type HomepageSliderRecord = HomepageSlide & {
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type HomepageSliderInput = {
  imageUrl: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  altText: string;
  sortOrder: number;
  isActive: boolean;
};

type HomepageSliderModel = {
  findMany: (args: unknown) => Promise<HomepageSliderRecord[]>;
  findUnique: (args: unknown) => Promise<HomepageSliderRecord | null>;
  create: (args: unknown) => Promise<HomepageSliderRecord>;
  update: (args: unknown) => Promise<HomepageSliderRecord>;
  delete: (args: unknown) => Promise<HomepageSliderRecord>;
};

export type HomepageSliderPrismaClient = {
  homepageSliderSlide: HomepageSliderModel;
};

const LOCAL_IMAGE_PATH_PATTERN = /^\/images\/[A-Za-z0-9._/-]+$/;
const VERCEL_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

function normalizeSliderImagePath(value: string) {
  const path = value.trim();
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith("images/") ? `/${path}` : path;
}

function isAllowedSliderImagePath(value: string) {
  if (LOCAL_IMAGE_PATH_PATTERN.test(value)) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(VERCEL_BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

const sliderImagePathSchema = z
  .string()
  .transform(normalizeSliderImagePath)
  .pipe(
    z
      .string()
      .refine(isAllowedSliderImagePath, "Ảnh phải là path trong /images hoặc URL Vercel Blob")
  );

export const nullableTextSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  });

export const ctaUrlSchema = nullableTextSchema.refine(
  (value) =>
    value === null ||
    (value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.toLowerCase().includes("javascript:") &&
      !value.toLowerCase().startsWith("http://") &&
      !value.toLowerCase().startsWith("https://")),
  "CTA URL phải là đường dẫn nội bộ"
);

export const adminHomepageSliderSchema = z
  .object({
    imageUrl: sliderImagePathSchema,
    title: z.string().trim().min(1, "Tiêu đề là bắt buộc").max(180),
    subtitle: nullableTextSchema,
    eyebrow: nullableTextSchema,
    ctaLabel: nullableTextSchema,
    ctaUrl: ctaUrlSchema,
    altText: z.string().trim().min(1, "Alt text là bắt buộc").max(180),
    sortOrder: z.coerce.number().int().default(0),
    isActive: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    if (Boolean(value.ctaLabel) !== Boolean(value.ctaUrl)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ctaUrl"],
        message: "CTA cần có cả nhãn và đường dẫn",
      });
    }
  });

export function getHomepageSliderModel(
  client: unknown
): HomepageSliderPrismaClient["homepageSliderSlide"] {
  return (client as HomepageSliderPrismaClient).homepageSliderSlide;
}

function serializeDate(value: Date | string | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export function toHomepageSlide(record: HomepageSliderRecord): HomepageSlide {
  return {
    id: record.id,
    imageUrl: record.imageUrl,
    title: record.title,
    subtitle: record.subtitle,
    eyebrow: record.eyebrow,
    ctaLabel: record.ctaLabel,
    ctaUrl: record.ctaUrl,
    altText: record.altText,
    sortOrder: record.sortOrder,
    isActive: record.isActive,
  };
}

export function toAdminHomepageSlide(record: HomepageSliderRecord) {
  return {
    ...toHomepageSlide(record),
    createdAt: serializeDate(record.createdAt),
    updatedAt: serializeDate(record.updatedAt),
  };
}

export type AdminHomepageSliderInput = z.infer<typeof adminHomepageSliderSchema>;
