import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  adminHomepageSliderSchema,
  getHomepageSliderModel,
  toAdminHomepageSlide,
} from "@/lib/adminHomepageSlider";
import { validationError } from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  const slides = await getHomepageSliderModel(prisma).findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  return NextResponse.json({ items: slides.map(toAdminHomepageSlide) });
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = adminHomepageSliderSchema.safeParse(body);

  if (!parsed.success) return validationError(parsed.error);

  const slide = await getHomepageSliderModel(prisma).create({
    data: parsed.data,
  });

  revalidatePath("/");

  return NextResponse.json(toAdminHomepageSlide(slide), { status: 201 });
}
