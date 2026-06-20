import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("package scripts", () => {
  const pkg = JSON.parse(
    readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };

  it("runs the Next dev server without Turbopack to keep SSR hydration stable", () => {
    expect(pkg.scripts["dev:web"]).toBe("next dev");
    expect(pkg.scripts["dev:web"]).not.toContain("--turbo");
  });
});
