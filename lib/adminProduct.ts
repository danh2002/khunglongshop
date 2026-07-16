import { z } from "zod";

export const productSortFields = ["title", "price", "inStock"] as const;
export const stockFilters = ["all", "in-stock", "out-of-stock"] as const;

const LOCAL_IMAGE_PATH_PATTERN = /^\/images\/[A-Za-z0-9._/-]+$/;
const VERCEL_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeAdminImagePath(value: string) {
  const path = value.trim();
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith("images/") ? `/${path}` : path;
}

function isAllowedAdminImagePath(value: string) {
  if (LOCAL_IMAGE_PATH_PATTERN.test(value)) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(VERCEL_BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

const adminImagePathSchema = z
  .string()
  .transform(normalizeAdminImagePath)
  .pipe(
    z
      .string()
      .refine(isAllowedAdminImagePath, "Ảnh phải là path trong /images hoặc URL Vercel Blob")
  );

const galleryImagesSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.array(adminImagePathSchema).max(8, "Tối đa 8 ảnh phụ"));

const nullableSlotSchema = z.preprocess(
  (value) => (value === "" || value === "null" || value === undefined ? null : value),
  z.coerce.number().int().nullable()
);

export const adminProductSchema = z
  .object({
    title: z.string().trim().min(1, "Tên sản phẩm là bắt buộc").max(180),
    slug: z.string().trim().min(1, "Slug là bắt buộc").max(180).transform(normalizeSlug),
    mainImage: adminImagePathSchema,
    images: galleryImagesSchema.optional().default([]),
    price: z.coerce.number().int().min(0, "Giá phải là số VND không âm"),
    rating: z.coerce.number().int().min(0).max(5).optional().default(5),
    description: z.string().trim().min(1, "Mô tả là bắt buộc").max(4000),
    manufacturer: z.string().trim().min(1, "Nhà sản xuất là bắt buộc").max(180),
    inStock: z.coerce.number().int().min(0, "Tồn kho không được âm"),
    categoryId: z.string().trim(),
    merchantId: z.string().trim().min(1, "Merchant là bắt buộc"),
    isCollector: z.coerce.boolean().default(false),
    isVisible: z.boolean(),
    setId: z.string().trim().nullable().optional(),
    setSlotNumber: nullableSlotSchema.optional(),
    isBlindBox: z.coerce.boolean().default(false),
    blindBoxSetId: z.string().trim().nullable().optional(),
  })
  .transform((value) => {
    return {
      ...value,
      setId: value.isCollector ? value.setId : null,
      setSlotNumber: value.isCollector ? value.setSlotNumber : null,
      blindBoxSetId: value.isBlindBox ? value.blindBoxSetId : null,
    };
  })
  .superRefine((value, context) => {
    if (!value.isBlindBox && (!value.categoryId || value.categoryId.trim() === "")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Danh mục là bắt buộc",
        path: ["categoryId"],
      });
    }

    if (value.isCollector && value.isBlindBox) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["isBlindBox"],
        message: "Sản phẩm không thể vừa là mẫu sưu tập vừa là túi mù",
      });
    }

    if (value.isCollector) {
      if (!value.setId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["setId"],
          message: "Sản phẩm sưu tập cần bộ sưu tập",
        });
      }

      if (!value.setSlotNumber || value.setSlotNumber < 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["setSlotNumber"],
          message: "Sản phẩm sưu tập cần slot hợp lệ",
        });
      }
    }

  });

export type AdminProductInput = z.infer<typeof adminProductSchema>;

export function serializeProductImages(images: string[] | undefined) {
  return JSON.stringify(images ?? []);
}

export function parseProductImages(images: string | null | undefined): string[] {
  if (!images) return [];

  try {
    const parsed: unknown = JSON.parse(images);
    return Array.isArray(parsed) && parsed.every((image) => typeof image === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function normalizeImageForDisplay(path: string | null | undefined) {
  const imagePath = path?.trim();
  if (!imagePath) return "/product_placeholder.jpg";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
}
