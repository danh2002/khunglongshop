import { describe, expect, it } from "vitest";
import { resolveApiUrl } from "@/lib/api";

describe("API URL resolution", () => {
  it("keeps browser requests on the current Next.js origin", () => {
    expect(resolveApiUrl("/api/products", "http://localhost:3001", true)).toBe(
      "/api/products"
    );
  });

  it("uses an absolute base URL for server-side requests", () => {
    expect(resolveApiUrl("/api/products", "http://localhost:3000", false)).toBe(
      "http://localhost:3000/api/products"
    );
  });
});
