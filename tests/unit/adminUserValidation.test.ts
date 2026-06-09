import { describe, expect, it } from "vitest";
import { adminUserUpdateSchema } from "@/lib/adminUserValidation";

describe("admin user password reset validation", () => {
  it("accepts a six-character test password", () => {
    expect(
      adminUserUpdateSchema.safeParse({ password: "123123" }).success
    ).toBe(true);
  });

  it("rejects passwords shorter than six characters with a field error", () => {
    const result = adminUserUpdateSchema.safeParse({ password: "12345" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password?.[0]).toBe(
        "Mật khẩu mới phải có ít nhất 6 ký tự."
      );
    }
  });
});
