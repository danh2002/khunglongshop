import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAccountOrderOwnershipWhere, getStatusRawValues } from "@/lib/accountOrders";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderWhere = getAccountOrderOwnershipWhere(user);

  const [orderCount, completedOrderCount, canceledOrderCount, sets, unlockedProductGroups] = await Promise.all([
    prisma.customer_order.count({ where: orderWhere }),
    prisma.customer_order.count({
      where: {
        AND: [
          orderWhere,
          {
            status: {
              in: getStatusRawValues("delivered") ?? [],
            },
          },
        ],
      },
    }),
    prisma.customer_order.count({
      where: {
        AND: [
          orderWhere,
          {
            status: {
              in: getStatusRawValues("canceled") ?? [],
            },
          },
        ],
      },
    }),
    prisma.collectorSet.findMany({
      select: {
        id: true,
        totalSlots: true,
      },
    }),
    prisma.redemptionCode.groupBy({
      by: ["productId"],
      where: {
        userId: user.id,
        status: "REDEEMED",
      },
    }),
  ]);

  const collectorProducts = await prisma.product.findMany({
    where: {
      isCollector: true,
      setId: {
        in: sets.map((set) => set.id),
      },
    },
    select: {
      id: true,
      setId: true,
    },
  });

  const unlockedProductIds = new Set(unlockedProductGroups.map((group) => group.productId));
  const unlockedCollectionSlots = collectorProducts.filter((product) => unlockedProductIds.has(product.id)).length;
  const totalCollectionSlots = sets.reduce((sum, set) => sum + set.totalSlots, 0);
  const productsBySetId = new Map<string, typeof collectorProducts>();

  for (const product of collectorProducts) {
    if (!product.setId) continue;
    productsBySetId.set(product.setId, [...(productsBySetId.get(product.setId) ?? []), product]);
  }

  const completedCollectionSets = sets.filter((set) => {
    const productsInSet = productsBySetId.get(set.id) ?? [];
    return productsInSet.length === set.totalSlots && productsInSet.every((product) => unlockedProductIds.has(product.id));
  }).length;
  const activeOrderCount = Math.max(orderCount - completedOrderCount - canceledOrderCount, 0);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? "",
      role: user.role ?? "user",
    },
    stats: {
      orderCount,
      activeOrderCount,
      completedOrderCount,
      unlockedCollectionSlots,
      totalCollectionSlots,
      completedCollectionSets,
    },
  });
}
