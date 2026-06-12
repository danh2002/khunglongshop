import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Header navigation", () => {
  it("does not pass Next Link through styled-components' as prop", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components", "Header.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(/as=\{[^}]*Link/);
    expect(source).not.toContain("renderCategoryLinks(true)");
    expect(source).not.toContain("renderCharacterLinks(true)");
  });
});
