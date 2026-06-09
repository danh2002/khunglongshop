import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { createPagination, parseAdminPagination } from "@/lib/adminApi";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { page, limit, skip } = parseAdminPagination(request.nextUrl.searchParams);
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const setId = request.nextUrl.searchParams.get("set") || undefined;
  const claimed = request.nextUrl.searchParams.get("isClaimed");
  const where: Prisma.SetRewardWhereInput = {
    ...(setId ? { setId } : {}),
    ...(claimed === "claimed" ? { isClaimed: true } : {}),
    ...(claimed === "pending" ? { isClaimed: false } : {}),
    ...(search
      ? {
          OR: [
            { rewardCode: { contains: search } },
            { user: { email: { contains: search } } },
          ],
        }
      : {}),
  };
  const [items, totalItems] = await Promise.all([
    prisma.setReward.findMany({
      where,
      skip,
      take: limit,
      orderBy: { grantedAt: "desc" },
      include: {
        set: { select: { id: true, name: true, totalSlots: true } },
        user: { select: { id: true, email: true } },
      },
    }),
    prisma.setReward.count({ where }),
  ]);
  return NextResponse.json({ items, pagination: createPagination(page, limit, totalItems) });
}
