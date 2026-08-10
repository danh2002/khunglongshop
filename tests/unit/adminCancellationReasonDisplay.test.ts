import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "app/(dashboard)/admin/orders/[id]/page.tsx"),
  "utf8"
);

describe("admin cancellation reason display", () => {
  it("loads the latest cancellation audit reason only for cancelled orders", () => {
    expect(source).toContain('order.status === "CANCELLED"');
    expect(source).toContain('action: "ORDER_CANCELLED"');
    expect(source).toContain('entityType: "Customer_order"');
    expect(source).toContain('orderBy: { createdAt: "desc" }');
    expect(source).toContain("function getCancellationReason(metadata: Prisma.JsonValue | null)");
  });

  it("renders a highlighted reason block only when a non-empty reason exists", () => {
    expect(source).toContain('order.status === "CANCELLED" && cancellationReason');
    expect(source).toContain("Lý do huỷ");
    expect(source).toContain("border-l-4 border-red-500 bg-red-950/30");
    expect(source).toContain("text-gray-300");
  });
});
