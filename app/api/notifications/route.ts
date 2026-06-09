import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import {
  notificationCreateSchema,
  notificationFiltersSchema,
} from "@/lib/notificationValidation";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = notificationFiltersSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "Bộ lọc thông báo không hợp lệ" } },
      { status: 400 }
    );
  }

  const { page, limit, sortBy, sortOrder, type, isRead, search } = parsed.data;
  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(type ? { type } : {}),
    ...(isRead !== undefined ? { isRead } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { message: { contains: search } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.NotificationOrderByWithRelationInput[] =
    sortBy === "priority"
      ? [{ priority: sortOrder }, { createdAt: "desc" }]
      : [{ createdAt: sortOrder }];

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return NextResponse.json({
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    unreadCount,
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = notificationCreateSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "Dữ liệu thông báo không hợp lệ" } },
      { status: 400 }
    );
  }

  const userExists = await prisma.user.count({ where: { id: parsed.data.userId } });
  if (!userExists) {
    return NextResponse.json(
      { error: { message: "Không tìm thấy người dùng" } },
      { status: 404 }
    );
  }

  const { metadata, ...notificationData } = parsed.data;
  const notification = await prisma.notification.create({
    data: {
      ...notificationData,
      ...(metadata !== undefined
        ? { metadata: metadata as Prisma.InputJsonValue }
        : {}),
    },
  });

  return NextResponse.json(notification, { status: 201 });
}
