import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Ricon pool seed script", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts", "seed-ricon-pool.js"),
    "utf8",
  );

  it("publishes an active Ricon pool with entries for slotted collector products", () => {
    expect(source).toContain('const SET_SLUG = "ricon"');
    expect(source).toContain('const POOL_ID = "ricon-pool-v1"');
    expect(source).toContain('status: "ACTIVE"');
    expect(source).toContain("activeSetKey: collectorSet.id");
    expect(source).toContain("blindBoxPoolEntry.createMany");
    expect(source).toContain("product.setSlotNumber");
  });
});
