import { describe, expect, it } from "vitest";
import {
  adminUserCreateSchema,
  adminUserListQuerySchema,
  adminUserUpdateSchema,
} from "@/lib/adminUserValidation";

const strongPassword = "StrongPass1!";

describe("admin user validation", () => {
  it("uses the same strong password policy for create and reset", () => {
    expect(
      adminUserCreateSchema.safeParse({
        email: "admin@example.com",
        password: strongPassword,
      }).success
    ).toBe(true);
    expect(
      adminUserUpdateSchema.safeParse({ password: strongPassword }).success
    ).toBe(true);
  });

  it("rejects weak reset passwords", () => {
    const result = adminUserUpdateSchema.safeParse({ password: "123123" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toBeDefined();
    }
  });

  it("normalizes email and defaults create role to user", () => {
    const result = adminUserCreateSchema.parse({
      email: "  ADMIN@EXAMPLE.COM ",
      password: strongPassword,
    });

    expect(result).toMatchObject({
      email: "admin@example.com",
      role: "user",
    });
  });

  it("validates and defaults list query values", () => {
    expect(adminUserListQuerySchema.parse({})).toMatchObject({
      page: 1,
      limit: 20,
      sort: "email",
      direction: "asc",
    });
    expect(
      adminUserListQuerySchema.safeParse({ status: "archived" }).success
    ).toBe(false);
  });

  it("requires at least one update field", () => {
    expect(adminUserUpdateSchema.safeParse({}).success).toBe(false);
  });
});
