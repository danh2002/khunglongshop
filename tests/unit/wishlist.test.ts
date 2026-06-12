import { describe, expect, it } from "vitest";
import { normalizeWishlistResponse } from "@/lib/wishlist";

describe("wishlist response normalization", () => {
  it("supports array and wrapped API responses", () => {
    const items = [{ id: "wish-1" }];

    expect(normalizeWishlistResponse(items)).toEqual(items);
    expect(normalizeWishlistResponse({ data: items })).toEqual(items);
    expect(normalizeWishlistResponse({ wishlist: items })).toEqual(items);
    expect(normalizeWishlistResponse({ items })).toEqual(items);
  });

  it("returns an empty array for errors and missing payloads", () => {
    expect(normalizeWishlistResponse(null)).toEqual([]);
    expect(normalizeWishlistResponse({ error: "Route not found" })).toEqual([]);
  });
});
