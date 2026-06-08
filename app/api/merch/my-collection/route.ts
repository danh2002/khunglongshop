import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [sets, redemptionCodes, setRewards] = await Promise.all([
    prisma.collectorSet.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        products: {
          where: { isCollector: true },
          select: {
            id: true,
            title: true,
            mainImage: true,
            setSlotNumber: true,
          },
        },
      },
    }),
    prisma.redemptionCode.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.setReward.findMany({
      where: { userId },
      orderBy: { grantedAt: "desc" },
    }),
  ]);

  const usedCodesByProductId = new Map<string, (typeof redemptionCodes)[number]>();

  for (const code of redemptionCodes) {
    if (code.isUsed && !usedCodesByProductId.has(code.productId)) {
      usedCodesByProductId.set(code.productId, code);
    }
  }

  const rewardBySetId = new Map(setRewards.map((reward) => [reward.setId, reward]));

  return NextResponse.json(
    sets.map((collectorSet) => {
      const productsBySlot = new Map(
        collectorSet.products
          .filter((product) => product.setSlotNumber !== null)
          .map((product) => [product.setSlotNumber!, product])
      );

      const slots = Array.from({ length: collectorSet.totalSlots }, (_, index) => {
        const slotNumber = index + 1;
        const product = productsBySlot.get(slotNumber);
        const code = product ? usedCodesByProductId.get(product.id) : null;
        const isUnlocked = Boolean(code);

        return {
          slotNumber,
          product: product
            ? {
                id: product.id,
                name: product.title,
                image: product.mainImage,
              }
            : null,
          code: code?.code ?? null,
          isUnlocked,
          isCollected: isUnlocked,
        };
      });
      const setReward = rewardBySetId.get(collectorSet.id);

      return {
        set: {
          id: collectorSet.id,
          name: collectorSet.name,
          description: collectorSet.description,
          totalSlots: collectorSet.totalSlots,
        },
        slots,
        isComplete: slots.length === collectorSet.totalSlots && slots.every((slot) => slot.isUnlocked),
        setReward: setReward
          ? {
              rewardCode: setReward.rewardCode,
              isClaimed: setReward.isClaimed,
            }
          : null,
      };
    })
  );
}
