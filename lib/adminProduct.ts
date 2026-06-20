import { z } from "zod";

export const productSortFields = ["title", "price", "inStock"] as const;
export const stockFilters = ["all", "in-stock", "out-of-stock"] as const;

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeLocalImagePath(value: string) {
  const path = value.trim();
  return path.startsWith("images/") ? `/${path}` : path;
}

const localImagePathSchema = z
  .string()
  .transform(normalizeLocalImagePath)
  .pipe(
    z
      .string()
      .regex(/^\/images\/[A-Za-z0-9._/-]+$/, "Ảnh phải là path trong /images")
  );

const galleryImagesSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.array(localImagePathSchema).max(8, "Tối đa 8 ảnh phụ"));

const nullableSlotSchema = z.preprocess(
  (value) => (value === "" || value === "null" || value === undefined ? null : value),
  z.coerce.number().int().nullable()
);

export const adminProductSchema = z
  .object({
    title: z.string().trim().min(1, "Tên sản phẩm là bắt buộc").max(180),
    slug: z.string().trim().min(1, "Slug là bắt buộc").max(180).transform(normalizeSlug),
    mainImage: localImagePathSchema,
    images: galleryImagesSchema.optional().default([]),
    price: z.coerce.number().int().min(0, "Giá phải là số VND không âm"),
    rating: z.coerce.number().int().min(0).max(5).optional().default(5),
    description: z.string().trim().min(1, "Mô tả là bắt buộc").max(4000),
    manufacturer: z.string().trim().min(1, "Nhà sản xuất là bắt buộc").max(180),
    inStock: z.coerce.number().int().min(0, "Tồn kho không được âm"),
    categoryId: z.string().trim().min(1, "Danh mục là bắt buộc"),
    merchantId: z.string().trim().min(1, "Merchant là bắt buộc"),
    isCollector: z.coerce.boolean().default(false),
    isVisible: z.coerce.boolean().default(false),
    setId: z.string().trim().nullable().optional(),
    setSlotNumber: nullableSlotSchema.optional(),
    isBlindBox: z.coerce.boolean().default(false),
    blindBoxSetId: z.string().trim().nullable().optional(),
  })
  .transform((value) => {
    return {
      ...value,
      isVisible: value.isCollector ? false : value.isVisible,
      setId: value.isCollector ? value.setId : null,
      setSlotNumber: value.isCollector ? value.setSlotNumber : null,
      blindBoxSetId: value.isBlindBox ? value.blindBoxSetId : null,
    };
  })
  .superRefine((value, context) => {
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

    if (value.isBlindBox && !value.blindBoxSetId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blindBoxSetId"],
        message: "Sản phẩm túi mù cần bộ sưu tập",
      });
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
  if (!path) return "/product_placeholder.jpg";
  return path.startsWith("/") ? path : `/${path}`;
}
