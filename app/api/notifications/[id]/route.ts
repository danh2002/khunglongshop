import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { notificationUpdateSchema } from "@/lib/notificationValidation";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = notificationUpdateSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "Dữ liệu cập nhật không hợp lệ" } },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const result = await prisma.notification.updateMany({
    where: { id, userId },
    data: parsed.data,
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: { message: "Không tìm thấy thông báo" } },
      { status: 404 }
    );
  }

  const notification = await prisma.notification.findUnique({ where: { id } });
  return NextResponse.json(notification);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await prisma.notification.deleteMany({
    where: { id, userId },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: { message: "Không tìm thấy thông báo" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ deletedCount: result.count });
}
