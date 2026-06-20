import { describe, expect, it } from "vitest";
import { normalizeSearchQuery } from "@/lib/search";

describe("public search query normalization", () => {
  it("trims q and uses it as the canonical query", () => {
    expect(normalizeSearchQuery({ q: "  vanie  " })).toBe("vanie");
  });

  it("falls back to legacy search when q is absent or blank", () => {
    expect(normalizeSearchQuery({ search: "  blind box " })).toBe("blind box");
    expect(normalizeSearchQuery({ q: "   ", search: "vanie" })).toBe("vanie");
  });

  it("lets non-empty q override legacy search", () => {
    expect(normalizeSearchQuery({ q: "abc", search: "vanie" })).toBe("abc");
  });

  it("treats whitespace-only values as empty", () => {
    expect(normalizeSearchQuery({ q: "   ", search: "  " })).toBe("");
  });
});
