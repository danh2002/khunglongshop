import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Next config", () => {
  const source = readFileSync(path.join(process.cwd(), "next.config.mjs"), "utf8");

  it("does not optimize styled-components imports to keep SSR class names stable", () => {
    expect(source).toContain("compiler");
    expect(source).toContain("styledComponents: true");
    expect(source).toContain("optimizePackageImports: ['react-icons']");
    expect(source).not.toContain("optimizePackageImports: ['styled-components'");
    expect(source).not.toContain("'styled-components', 'react-icons'");
  });
});
