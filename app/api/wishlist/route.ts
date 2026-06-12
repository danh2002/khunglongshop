import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isPubliclySellableProduct } from "@/lib/publicCatalog";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

const createSchema = z.object({
  productId: z.string().trim().min(1),
  userId: z.string().optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}

function attemptedUserId(request: NextRequest, bodyUserId?: string) {
  return (
    bodyUserId ||
    request.nextUrl.searchParams.get("userId") ||
    request.headers.get("userId") ||
    request.headers.get("x-user-id")
  );
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const attempted = attemptedUserId(request);
  if (attempted && attempted !== userId) return forbidden();

  const wishlist = await prisma.$transaction(async (tx) => {
    await tx.wishlist.deleteMany({
      where: {
        userId,
        product: {
          is: {
            OR: [
              { isVisible: false },
              { isBlindBox: false },
              { isCollector: true },
              { slug: { not: "vanie-blind-box" } },
            ],
          },
        },
      },
    });

    return tx.wishlist.findMany({
      where: { userId },
      orderBy: { id: "asc" },
      include: { product: true },
    });
  });

  return NextResponse.json({ wishlist });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  const attempted = attemptedUserId(request, parsed.data.userId);
  if (attempted && attempted !== userId) return forbidden();

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: {
      id: true,
      slug: true,
      isVisible: true,
      isBlindBox: true,
      isCollector: true,
    },
  });
  if (!product || !isPubliclySellableProduct(product)) {
    return NextResponse.json(
      { error: "PRODUCT_NOT_AVAILABLE" },
      { status: 422 }
    );
  }

  const existing = await prisma.wishlist.findFirst({
    where: { userId, productId: product.id },
    include: { product: true },
  });
  if (existing) {
    return NextResponse.json({ item: existing, created: false });
  }

  const item = await prisma.wishlist.create({
    data: { userId, productId: product.id },
    include: { product: true },
  });
  return NextResponse.json({ item, created: true }, { status: 201 });
}
