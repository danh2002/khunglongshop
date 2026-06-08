import prisma from "@/utils/db";
import { Prisma } from "@prisma/client";
import { generateRedemptionCode, generateSetRewardCode } from "./codes";
import { sendSetCompleteEmail } from "./emails/setComplete";

type PrismaLike = typeof prisma | Prisma.TransactionClient;

export class CollectorRedeemError extends Error {
  constructor(
    public code: "NOT_FOUND" | "ALREADY_USED" | "INVALID_COLLECTOR_ITEM",
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

async function createUniqueSetRewardCode(client: PrismaLike = prisma): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rewardCode = generateSetRewardCode();
    const existing = await client.setReward.findUnique({ where: { rewardCode } });

    if (!existing) {
      return rewardCode;
    }
  }

  throw new Error("Unable to generate a unique set reward code");
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

  const products = await client.product.findMany({
    where: {
      setId,
      isCollector: true,
    },
    select: {
      id: true,
      setSlotNumber: true,
    },
  });

  if (products.length !== collectorSet.totalSlots) {
    return false;
  }

  const usedCodes = await client.redemptionCode.findMany({
    where: {
      userId,
      isUsed: true,
      productId: {
        in: products.map((product) => product.id),
      },
    },
    select: {
      productId: true,
    },
  });
  const unlockedProductIds = new Set(usedCodes.map((code) => code.productId));

  return products.every((product) => unlockedProductIds.has(product.id));
}

async function grantSetRewardIfComplete(userId: string, setId: string, client: Prisma.TransactionClient) {
  const isComplete = await checkSetCompletion(userId, setId, client);

  if (!isComplete) {
    return null;
  }

  const existingReward = await client.setReward.findUnique({
    where: {
      userId_setId: {
        userId,
        setId,
      },
    },
  });

  if (existingReward) {
    return existingReward;
  }

  return client.setReward.create({
    data: {
      userId,
      setId,
      rewardCode: await createUniqueSetRewardCode(client),
    },
    include: {
      set: true,
    },
  });
}

export async function redeemProductCodeForUser(rawCode: string, userId: string) {
  const normalizedCode = rawCode.trim().toUpperCase();

  const result = await prisma.$transaction(async (tx) => {
    const redemptionCode = await tx.redemptionCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!redemptionCode || redemptionCode.userId !== userId) {
      throw new CollectorRedeemError("NOT_FOUND", "Code not found");
    }

    if (redemptionCode.isUsed) {
      throw new CollectorRedeemError("ALREADY_USED", "Code already used");
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
        userId,
        isUsed: false,
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    if (updateResult.count !== 1) {
      throw new CollectorRedeemError("ALREADY_USED", "Code already used");
    }

    const setReward = await grantSetRewardIfComplete(userId, product.setId, tx);

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
      setReward: setReward
        ? {
            rewardCode: setReward.rewardCode,
            isClaimed: setReward.isClaimed,
          }
        : null,
    };
  });

  if (result.setReward) {
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
