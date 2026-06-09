import { NextResponse } from "next/server";
import { z } from "zod";
import { validationError } from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

const settingsSchema = z
  .object({
    siteName: z.string().trim().min(1).max(120),
    supportEmail: z.string().trim().email().nullable(),
    supportPhone: z.string().trim().regex(/^[+()\d\s.-]{7,25}$/).nullable(),
    shippingNotice: z.string().trim().max(1000).nullable(),
    maintenanceMode: z.boolean(),
    defaultLocale: z.enum(["vi", "en", "zh"]),
  })
  .strict();

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;
  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
    include: { updatedBy: { select: { id: true, email: true } } },
  });
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed.data, updatedById: session!.user.id },
    update: { ...parsed.data, updatedById: session!.user.id },
    include: { updatedBy: { select: { id: true, email: true } } },
  });
  return NextResponse.json(settings);
}
