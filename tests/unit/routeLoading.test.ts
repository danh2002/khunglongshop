import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const loadingRoutes = [
  "app/loading.tsx",
  "app/shop/loading.tsx",
  "app/product/[productSlug]/loading.tsx",
];

describe("route loading components", () => {
  it.each(loadingRoutes)("renders JSX from %s instead of exporting an imported function", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");

    expect(source).toContain("<RouteLoading />");
    expect(source).not.toMatch(/export default RouteLoading\s*;/);
  });
});
