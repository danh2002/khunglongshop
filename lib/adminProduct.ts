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

export const adminProductSchema = z
  .object({
    title: z.string().trim().min(1, "Tên sản phẩm là bắt buộc").max(180),
    slug: z.string().trim().min(1, "Slug là bắt buộc").max(180).transform(normalizeSlug),
    mainImage: z
      .string()
      .trim()
      .min(1, "Ảnh chính là bắt buộc")
      .regex(/^\/images\/[A-Za-z0-9._/-]+$/, "Ảnh phải là path trong /images"),
    price: z.coerce.number().int().min(0, "Giá phải là số VND không âm"),
    rating: z.coerce.number().int().min(0).max(5).optional().default(5),
    description: z.string().trim().min(1, "Mô tả là bắt buộc").max(4000),
    manufacturer: z.string().trim().min(1, "Nhà sản xuất là bắt buộc").max(180),
    inStock: z.coerce.number().int().min(0, "Tồn kho không được âm"),
    categoryId: z.string().trim().min(1, "Danh mục là bắt buộc"),
    merchantId: z.string().trim().min(1, "Merchant là bắt buộc"),
    isCollector: z.coerce.boolean().default(false),
    setId: z.string().trim().nullable().optional(),
    setSlotNumber: z.coerce.number().int().nullable().optional(),
  })
  .transform((value) => {
    if (!value.isCollector) {
      return { ...value, setId: null, setSlotNumber: null };
    }

    return value;
  })
  .superRefine((value, context) => {
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

export function normalizeImageForDisplay(path: string | null | undefined) {
  if (!path) return "/product_placeholder.jpg";
  return path.startsWith("/") ? path : `/${path}`;
}
