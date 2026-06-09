import { describe, expect, it } from "vitest";
import { canTransitionOrderStatus } from "@/lib/orderTransitions";

describe("order status transitions", () => {
  it("allows the locked happy path", () => {
    expect(canTransitionOrderStatus("PENDING", "PROCESSING")).toBe(true);
    expect(canTransitionOrderStatus("PROCESSING", "SHIPPED")).toBe(true);
    expect(canTransitionOrderStatus("SHIPPED", "DELIVERED")).toBe(true);
  });

  it("only allows cancellation before shipping", () => {
    expect(canTransitionOrderStatus("PENDING", "CANCELLED")).toBe(true);
    expect(canTransitionOrderStatus("PROCESSING", "CANCELLED")).toBe(true);
    expect(canTransitionOrderStatus("SHIPPED", "CANCELLED")).toBe(false);
  });

  it("keeps delivered and cancelled terminal", () => {
    expect(canTransitionOrderStatus("DELIVERED", "PENDING")).toBe(false);
    expect(canTransitionOrderStatus("CANCELLED", "PROCESSING")).toBe(false);
  });
});
