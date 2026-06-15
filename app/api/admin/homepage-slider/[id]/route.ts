import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  adminHomepageSliderSchema,
  getHomepageSliderModel,
  toAdminHomepageSlide,
} from "@/lib/adminHomepageSlider";
import { adminError, validationError } from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { id } = await context.params;
  const slide = await getHomepageSliderModel(prisma).findUnique({
    where: { id },
  });

  if (!slide) {
    return adminError(404, "SLIDE_NOT_FOUND", "Không tìm thấy slide.");
  }

  return NextResponse.json(toAdminHomepageSlide(slide));
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = adminHomepageSliderSchema.safeParse(body);

  if (!parsed.success) return validationError(parsed.error);

  const existingSlide = await getHomepageSliderModel(prisma).findUnique({
    where: { id },
  });

  if (!existingSlide) {
    return adminError(404, "SLIDE_NOT_FOUND", "Không tìm thấy slide.");
  }

  const slide = await getHomepageSliderModel(prisma).update({
    where: { id },
    data: parsed.data,
  });

  revalidatePath("/");

  return NextResponse.json(toAdminHomepageSlide(slide));
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return PATCH(request, context);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { id } = await context.params;
  const existingSlide = await getHomepageSliderModel(prisma).findUnique({
    where: { id },
  });

  if (!existingSlide) {
    return adminError(404, "SLIDE_NOT_FOUND", "Không tìm thấy slide.");
  }

  await getHomepageSliderModel(prisma).delete({
    where: { id },
  });

  revalidatePath("/");

  return NextResponse.json({ ok: true });
}
