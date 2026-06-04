import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/utils/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id;

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

  const codesByProductId = new Map<string, (typeof redemptionCodes)[number]>();

  for (const code of redemptionCodes) {
    if (!codesByProductId.has(code.productId) || !code.isUsed) {
      codesByProductId.set(code.productId, code);
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
        const code = product ? codesByProductId.get(product.id) : null;

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
          isCollected: Boolean(code),
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
        isComplete: slots.length === collectorSet.totalSlots && slots.every((slot) => slot.isCollected),
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
