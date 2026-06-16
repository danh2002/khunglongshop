import { describe, expect, it } from "vitest";
import {
  createUniqueRedemptionCodeValue,
  RedemptionCodeGenerationError,
} from "@/lib/redemptionCodes";

function fakeClient(existingCodes: Set<string>) {
  return {
    redemptionCode: {
      findUnique: async ({ where }: { where: { code: string } }) =>
        existingCodes.has(where.code) ? { id: "existing", code: where.code } : null,
    },
  } as any;
}

describe("redemption code generation", () => {
  it("retries generated values until a unique code is found", async () => {
    const generated = ["DKL-DUPE-0001-0001", "DKL-UNIQ-0001-0001"];
    const code = await createUniqueRedemptionCodeValue(
      fakeClient(new Set(["DKL-DUPE-0001-0001"])),
      2,
      () => generated.shift()!
    );

    expect(code).toBe("DKL-UNIQ-0001-0001");
  });

  it("throws after exhausting unique generation attempts", async () => {
    await expect(
      createUniqueRedemptionCodeValue(
        fakeClient(new Set(["DKL-DUPE-0001-0001"])),
        2,
        () => "DKL-DUPE-0001-0001"
      )
    ).rejects.toBeInstanceOf(RedemptionCodeGenerationError);
  });
});
