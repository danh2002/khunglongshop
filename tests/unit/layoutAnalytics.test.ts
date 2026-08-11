import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("root layout analytics wiring", () => {
  it("keeps Analytics while omitting Speed Insights", () => {
    const source = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8");

    expect(source).toContain('import { Analytics } from "@vercel/analytics/next"');
    expect(source).toContain("<Analytics />");
    expect(source).not.toContain("SpeedInsights");
    expect(source).not.toContain("@vercel/speed-insights");
  });
});
