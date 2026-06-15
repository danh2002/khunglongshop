import { z } from "zod";
import { commonValidations } from "@/utils/validation";

const adminEmailSchema = z.preprocess(
  (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  commonValidations.email
);

export const adminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(254).optional(),
  role: z.enum(["admin", "user"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sort: z.enum(["email", "role"]).default("email"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

export const adminUserCreateSchema = z.object({
  email: adminEmailSchema,
  password: commonValidations.password,
  role: z.enum(["admin", "user"]).default("user"),
});

export const adminPasswordResetSchema = commonValidations.password;

export const adminUserUpdateSchema = z
  .object({
    email: adminEmailSchema.optional(),
    password: adminPasswordResetSchema.optional().or(z.literal("")),
    role: z.enum(["admin", "user"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.email !== undefined ||
      value.password !== undefined ||
      value.role !== undefined ||
      value.isActive !== undefined,
    {
      message: "Cần có ít nhất một thay đổi.",
    }
  );
