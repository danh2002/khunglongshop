import { describe, expect, it } from "vitest";
import {
  canRestoreCancelledOrder,
  canTransitionOrderStatus,
} from "@/lib/orderTransitions";

describe("order status transitions", () => {
  it("allows the locked happy path", () => {
    expect(canTransitionOrderStatus("PENDING_PAYMENT", "PROCESSING")).toBe(true);
    expect(canTransitionOrderStatus("PROCESSING", "COMPLETED")).toBe(true);
  });

  it("only allows cancellation before completion", () => {
    expect(canTransitionOrderStatus("PENDING_PAYMENT", "CANCELLED")).toBe(true);
    expect(canTransitionOrderStatus("PROCESSING", "CANCELLED")).toBe(true);
    expect(canTransitionOrderStatus("COMPLETED", "CANCELLED")).toBe(false);
  });

  it("keeps completed and cancelled terminal", () => {
    expect(canTransitionOrderStatus("COMPLETED", "PENDING_PAYMENT")).toBe(false);
    expect(canTransitionOrderStatus("CANCELLED", "PENDING_PAYMENT")).toBe(false);
    expect(canTransitionOrderStatus("CANCELLED", "PROCESSING")).toBe(false);
    expect(canTransitionOrderStatus("CANCELLED", "COMPLETED")).toBe(false);
  });

  it("recognizes restoration separately from ordinary transitions", () => {
    expect(canRestoreCancelledOrder("CANCELLED")).toBe(true);
    expect(canRestoreCancelledOrder("PENDING_PAYMENT")).toBe(false);
    expect(canRestoreCancelledOrder("PROCESSING")).toBe(false);
    expect(canRestoreCancelledOrder("COMPLETED")).toBe(false);
  });
});
