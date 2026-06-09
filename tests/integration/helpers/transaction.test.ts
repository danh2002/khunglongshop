import { afterEach, describe, expect, it, vi } from "vitest";
import { withRollback } from "./transaction";

describe("integration transaction guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects production execution", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(withRollback(async () => true)).rejects.toThrow(
      "Integration tests must not run with NODE_ENV=production"
    );
  });
});
