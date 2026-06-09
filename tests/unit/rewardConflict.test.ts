import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { grantSetRewardIfComplete } from "@/lib/collectorService";

function p2002(target: string[]) {
  return new Prisma.PrismaClientKnownRequestError("Unique conflict", {
    code: "P2002",
    clientVersion: "6.16.1",
    meta: { target },
  });
}

function completeClient(create: ReturnType<typeof vi.fn>) {
  return {
    collectorSet: {
      findUnique: vi.fn().mockResolvedValue({ id: "set-1", totalSlots: 1 }),
    },
    redemptionCode: {
      findMany: vi.fn().mockResolvedValue([{ product: { setSlotNumber: 1 } }]),
    },
    setReward: {
      create,
      findUnique: vi.fn(),
    },
  };
}

describe("set reward unique conflicts", () => {
  it("retries rewardCode collisions at most three times", async () => {
    const create = vi.fn().mockRejectedValue(p2002(["rewardCode"]));
    const client = completeClient(create);

    await expect(
      grantSetRewardIfComplete("user-1", "set-1", client as never)
    ).rejects.toMatchObject({ code: "P2002" });
    expect(create).toHaveBeenCalledTimes(3);
  });

  it("rethrows non-retryable P2002 so the transaction can roll back", async () => {
    const conflict = p2002(["unexpectedConstraint"]);
    const create = vi.fn().mockRejectedValue(conflict);
    const client = completeClient(create);

    await expect(
      grantSetRewardIfComplete("user-1", "set-1", client as never)
    ).rejects.toBe(conflict);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
