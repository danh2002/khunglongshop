import { z } from "zod";
import { commonValidations } from "@/utils/validation";

export const adminPasswordResetSchema = z
  .string()
  .min(6, "Mật khẩu mới phải có ít nhất 6 ký tự.")
  .max(128, "Mật khẩu mới không được vượt quá 128 ký tự.");

export const adminUserUpdateSchema = z
  .object({
    email: commonValidations.email.optional(),
    password: adminPasswordResetSchema.optional().or(z.literal("")),
    role: z.enum(["admin", "user"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.email ||
      value.password ||
      value.role ||
      value.isActive !== undefined,
    {
      message: "Cần có ít nhất một thay đổi.",
    }
  );
