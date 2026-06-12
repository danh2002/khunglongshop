import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const attempted =
    request.nextUrl.searchParams.get("userId") ||
    request.headers.get("userId") ||
    request.headers.get("x-user-id");
  if (attempted && attempted !== userId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { productId } = await params;
  const result = await prisma.wishlist.deleteMany({
    where: { userId, productId },
  });
  return NextResponse.json({ deletedCount: result.count });
}
