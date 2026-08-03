import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const dynamic = "force-dynamic";

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
  return NextResponse.json(settings, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
