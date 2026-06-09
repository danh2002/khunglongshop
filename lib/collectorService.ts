import prisma from "@/utils/db";
import { Prisma } from "@prisma/client";
import { generateRedemptionCode, generateSetRewardCode } from "./codes";
import { sendSetCompleteEmail } from "./emails/setComplete";

type PrismaLike = typeof prisma | Prisma.TransactionClient;

export class CollectorRedeemError extends Error {
  constructor(
    public code:
      | "NOT_FOUND"
      | "ALREADY_USED_OR_NOT_OWNED"
      | "INVALID_COLLECTOR_ITEM",
    message: string
  ) {
    super(message);
    this.name = "CollectorRedeemError";
  }
}

async function createUniqueRedemptionCode(client: PrismaLike = prisma): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateRedemptionCode();
    const existing = await client.redemptionCode.findUnique({ where: { code } });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Unable to generate a unique redemption code");
}

// Call this after an order is successfully paid.
export async function handleOrderCollectorItems(orderId: string, userId: string) {
  const items = await prisma.customer_order_product.findMany({
    where: {
      customerOrderId: orderId,
    },
    include: {
      product: {
        include: {
          set: true,
        },
      },
    },
  });

  const collectorItems = items.filter((item) => item.product.isCollector);

  for (const item of collectorItems) {
    const quantity = Math.max(item.quantity ?? 1, 1);
    const existingCodes = await prisma.redemptionCode.count({
      where: {
        orderId,
        userId,
        productId: item.productId,
      },
    });
    const missingCodeCount = Math.max(quantity - existingCodes, 0);

    for (let index = 0; index < missingCodeCount; index += 1) {
      await prisma.redemptionCode.create({
        data: {
          code: await createUniqueRedemptionCode(),
          productId: item.productId,
          orderId,
          userId,
          status: "ACTIVE",
          isUsed: false,
        },
      });
    }
  }

  // Purchase creates redemption codes only. Set rewards are granted after
  // the customer redeems enough product codes to unlock every set slot.
}

export async function checkSetCompletion(
  userId: string,
  setId: string,
  client: PrismaLike = prisma
): Promise<boolean> {
  const collectorSet = await client.collectorSet.findUnique({
    where: { id: setId },
  });

  if (!collectorSet) {
    return false;
  }

  const usedCodes = await client.redemptionCode.findMany({
    where: {
      userId,
      status: "REDEEMED",
      product: {
        setId,
        isCollector: true,
      },
    },
    select: {
      product: {
        select: {
          setSlotNumber: true,
        },
      },
    },
  });
  const unlockedSlots = new Set(
    usedCodes
      .map((code) => code.product.setSlotNumber)
      .filter((slot): slot is number => slot !== null)
  );

  return unlockedSlots.size >= collectorSet.totalSlots;
}

function p2002Targets(error: Prisma.PrismaClientKnownRequestError) {
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];
  return [];
}

function isUserSetConflict(targets: string[]) {
  const combined = targets.join(",").toLowerCase();
  return (
    (combined.includes("userid") && combined.includes("setid")) ||
    combined.includes("setreward_userid_setid_key")
  );
}

function isRewardCodeConflict(targets: string[]) {
  return targets.join(",").toLowerCase().includes("rewardcode");
}

export async function grantSetRewardIfComplete(
  userId: string,
  setId: string,
  client: Prisma.TransactionClient
) {
  const isComplete = await checkSetCompletion(userId, setId, client);

  if (!isComplete) {
    return { reward: null, rewardCreated: false };
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const reward = await client.setReward.create({
        data: {
          userId,
          setId,
          rewardCode: generateSetRewardCode(),
        },
        include: {
          set: true,
        },
      });
      return { reward, rewardCreated: true };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }

      const targets = p2002Targets(error);
      if (isUserSetConflict(targets)) {
        const reward = await client.setReward.findUnique({
          where: { userId_setId: { userId, setId } },
          include: { set: true },
        });
        if (!reward) throw error;
        return { reward, rewardCreated: false };
      }

      if (!isRewardCodeConflict(targets) || attempt === 3) {
        throw error;
      }
    }
  }

  throw new Error("Unable to create set reward");
}

export async function redeemProductCodeForUser(rawCode: string, userId: string) {
  const normalizedCode = rawCode.trim().toUpperCase();

  const result = await prisma.$transaction(async (tx) => {
    const redemptionCode = await tx.redemptionCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!redemptionCode) {
      throw new CollectorRedeemError("NOT_FOUND", "Code not found");
    }

    if (redemptionCode.status !== "ACTIVE") {
      throw new CollectorRedeemError(
        "ALREADY_USED_OR_NOT_OWNED",
        "Code already used or disabled"
      );
    }

    const product = await tx.product.findUnique({
      where: { id: redemptionCode.productId },
      select: {
        id: true,
        title: true,
        mainImage: true,
        isCollector: true,
        setId: true,
        setSlotNumber: true,
      },
    });

    if (!product?.isCollector || !product.setId || !product.setSlotNumber) {
      throw new CollectorRedeemError("INVALID_COLLECTOR_ITEM", "Code is not linked to a valid collector item");
    }

    const updateResult = await tx.redemptionCode.updateMany({
      where: {
        id: redemptionCode.id,
        status: "ACTIVE",
        OR: [{ userId: null }, { userId }],
      },
      data: {
        status: "REDEEMED",
        isUsed: true,
        userId,
        usedAt: new Date(),
      },
    });

    if (updateResult.count !== 1) {
      throw new CollectorRedeemError(
        "ALREADY_USED_OR_NOT_OWNED",
        "Code already used or not owned"
      );
    }

    const { reward: setReward, rewardCreated } = await grantSetRewardIfComplete(
      userId,
      product.setId,
      tx
    );

    return {
      unlockedSlot: {
        setId: product.setId,
        slotNumber: product.setSlotNumber,
        product: {
          id: product.id,
          name: product.title,
          image: product.mainImage,
        },
      },
      setComplete: Boolean(setReward),
      rewardCreated,
      setReward: setReward
        ? {
            rewardCode: setReward.rewardCode,
            isClaimed: setReward.isClaimed,
          }
        : null,
    };
  });

  if (result.setReward && result.rewardCreated) {
    const [user, collectorSet] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.collectorSet.findUnique({ where: { id: result.unlockedSlot.setId } }),
    ]);

    if (user?.email && collectorSet) {
      await sendSetCompleteEmail(user.email, collectorSet.name, result.setReward.rewardCode);
    }
  }

  return result;
}
