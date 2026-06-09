import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { notificationBulkSchema } from "@/lib/notificationValidation";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = notificationBulkSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "Danh sách thông báo không hợp lệ" } },
      { status: 400 }
    );
  }

  const result = await prisma.notification.deleteMany({
    where: {
      id: { in: parsed.data.notificationIds },
      userId,
    },
  });

  return NextResponse.json({ deletedCount: result.count });
}
