import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const { validateOrderData } = require("../../server/utills/validation");

const validOrder = {
  name: "Nguyen",
  lastname: "An",
  email: "an@example.com",
  phone: "0912345678",
  company: "Khach le",
  adress: "123 Nguyen Trai",
  apartment: "A1",
  city: "Ha Noi",
  country: "Viet Nam",
  postalCode: "100000",
  total: 1500000,
  status: "pending",
};

describe("order validation for VND totals", () => {
  it("accepts totals above the old USD-oriented limit", () => {
    const result = validateOrderData(validOrder);

    expect(result.isValid).toBe(true);
    expect(result.validatedData.total).toBe(1500000);
  });

  it("rejects zero-value orders", () => {
    const result = validateOrderData({ ...validOrder, total: 0 });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: "total" })
    );
  });
});

describe("checkout order transaction", () => {
  it("uses a TiDB-compatible isolation level", () => {
    const route = readFileSync(resolve(process.cwd(), "app/api/orders/route.ts"), "utf8");

    expect(route).toContain("Prisma.TransactionIsolationLevel.RepeatableRead");
    expect(route).not.toContain("Prisma.TransactionIsolationLevel.Serializable");
  });
});
