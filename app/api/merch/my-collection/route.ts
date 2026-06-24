import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";
import { summarizeProductOwnership } from "@/lib/collectionOwnership";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsedPage = parseInt(searchParams.get("page") ?? "1", 10);
  const parsedLimit = parseInt(searchParams.get("limit") ?? "10", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(20, parsedLimit) : 10;
  const skip = (page - 1) * limit;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [sets, totalSets, redemptionCodes, setRewards] = await Promise.all([
    prisma.collectorSet.findMany({
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
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
    prisma.collectorSet.count(),
    prisma.redemptionCode.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.setReward.findMany({
      where: { userId },
      orderBy: { grantedAt: "desc" },
    }),
  ]);

  const ownershipByProductId = summarizeProductOwnership(redemptionCodes);

  const rewardBySetId = new Map(setRewards.map((reward) => [reward.setId, reward]));

  return NextResponse.json({
    sets: sets.map((collectorSet) => {
      const productsBySlot = new Map(
        collectorSet.products
          .filter((product) => product.setSlotNumber !== null)
          .map((product) => [product.setSlotNumber!, product])
      );

      const slots = Array.from({ length: collectorSet.totalSlots }, (_, index) => {
        const slotNumber = index + 1;
        const product = productsBySlot.get(slotNumber);
        const ownership = product ? ownershipByProductId.get(product.id) : null;
        const isUnlocked = Boolean(ownership);

        return {
          slotNumber,
          productId: product?.id ?? null,
          ownedCount: ownership?.ownedCount ?? 0,
          firstRedeemedAt: ownership?.firstRedeemedAt?.toISOString() ?? null,
          product: product
            ? {
                id: product.id,
                name: product.title,
                image: product.mainImage,
              }
            : null,
          code: ownership?.firstCode.code ?? null,
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
    }),
    pagination: {
      page,
      limit,
      total: totalSets,
      totalPages: Math.ceil(totalSets / limit),
    },
  });
}
