import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRateLimitForTests,
  evictExpiredRateLimits,
  isRateLimited,
} from "@/lib/rateLimit";

describe("user rate limiter", () => {
  beforeEach(() => clearRateLimitForTests());

  it("allows five checkout attempts and blocks the sixth", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(isRateLimited("checkout:user-1", 5)).toBe(false);
    }
    expect(isRateLimited("checkout:user-1", 5)).toBe(true);
  });

  it("allows ten redeem attempts and isolates users", () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(isRateLimited("redeem:user-1", 10)).toBe(false);
    }
    expect(isRateLimited("redeem:user-1", 10)).toBe(true);
    expect(isRateLimited("redeem:user-2", 10)).toBe(false);
  });

  it("evicts buckets after two windows", () => {
    expect(isRateLimited("checkout:expired", 1, 1_000)).toBe(false);
    expect(isRateLimited("checkout:expired", 1, 1_000)).toBe(true);
    evictExpiredRateLimits(Date.now() + 2_001);
    expect(isRateLimited("checkout:expired", 1, 1_000)).toBe(false);
  });
});
