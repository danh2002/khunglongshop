import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsedPage = parseInt(searchParams.get("page") ?? "1", 10);
  const parsedLimit = parseInt(searchParams.get("limit") ?? "10", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(50, parsedLimit) : 10;
  const skip = (page - 1) * limit;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [redemptionCodes, setRewards, total] = await Promise.all([
    prisma.redemptionCode.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        allocation: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                mainImage: true,
                setSlotNumber: true,
              },
            },
            poolVersion: {
              select: {
                collectorSet: {
                  select: { id: true, name: true, totalSlots: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.setReward.findMany({
      where: { userId },
      orderBy: { grantedAt: "desc" },
      include: {
        set: true,
      },
    }),
    prisma.redemptionCode.count({ where: { userId } }),
  ]);
  const productIds = [...new Set(redemptionCodes.map((code) => code.productId))];
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      mainImage: true,
      setId: true,
      setSlotNumber: true,
    },
  });
  const setIds = [...new Set(products.map((product) => product.setId).filter(Boolean))] as string[];
  const collectorSets = await prisma.collectorSet.findMany({
    where: {
      id: {
        in: setIds,
      },
    },
    select: {
      id: true,
      name: true,
      totalSlots: true,
    },
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const setById = new Map(collectorSets.map((set) => [set.id, set]));

  return NextResponse.json({
    redemptionCodes: redemptionCodes.map((code) => ({
      ...code,
      canRedeem: code.status === "ACTIVE",
      redeemedAt: code.usedAt,
      allocation: code.allocation
        ? {
            id: code.allocation.id,
            status: code.allocation.status,
            rarityTier: code.allocation.rarityTier,
            product: code.allocation.product,
            set: code.allocation.poolVersion.collectorSet,
          }
        : null,
      product: productById.get(code.productId)
        ? {
            ...productById.get(code.productId),
            set: productById.get(code.productId)?.setId
              ? setById.get(productById.get(code.productId)!.setId!)
              : null,
          }
        : null,
    })),
    setRewards,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
