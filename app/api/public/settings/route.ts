import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export async function GET() {
  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
    select: {
      siteName: true,
      shippingNotice: true,
      maintenanceMode: true,
      defaultLocale: true,
    },
  });
  return NextResponse.json(settings);
}
