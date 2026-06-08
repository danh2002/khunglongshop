import { NextResponse } from "next/server";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  const [categories, merchants, collectorSets] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.merchant.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.collectorSet.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        totalSlots: true,
        products: {
          where: { isCollector: true, setSlotNumber: { not: null } },
          select: { id: true, title: true, setSlotNumber: true },
        },
      },
    }),
  ]);

  return NextResponse.json({ categories, merchants, collectorSets });
}
