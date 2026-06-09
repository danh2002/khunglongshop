import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { adminUserUpdateSchema } from "@/lib/adminUserValidation";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PrismaLike = typeof prisma | Prisma.TransactionClient;

function validationError(error: z.ZodError) {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu không hợp lệ",
        fieldErrors: error.flatten().fieldErrors,
      },
    },
    { status: 400 }
  );
}

async function getDependencyCounts(userId: string, client: PrismaLike = prisma) {
  const [
    orderCount,
    wishlistCount,
    notificationCount,
    bulkUploadBatchCount,
    redemptionCodeCount,
    setRewardCount,
    adminAuditLogCount,
  ] = await Promise.all([
    client.customer_order.count({ where: { userId } }),
    client.wishlist.count({ where: { userId } }),
    client.notification.count({ where: { userId } }),
    client.bulk_upload_batch.count({ where: { userId } }),
    client.redemptionCode.count({ where: { userId } }),
    client.setReward.count({ where: { userId } }),
    client.adminAuditLog.count({ where: { actorId: userId } }),
  ]);

  return {
    orderCount,
    wishlistCount,
    notificationCount,
    bulkUploadBatchCount,
    redemptionCodeCount,
    setRewardCount,
    adminAuditLogCount,
  };
}

function hasDependencies(counts: Awaited<ReturnType<typeof getDependencyCounts>>) {
  return Object.values(counts).some((count) => count > 0);
}

function dependencyErrorPayload(counts: Awaited<ReturnType<typeof getDependencyCounts>>) {
  return {
    error: {
      code: "USER_HAS_DEPENDENCIES",
      message: "Không thể xóa người dùng còn dữ liệu liên quan",
      fieldErrors: {
        dependencies: Object.entries(counts)
          .filter(([, count]) => count > 0)
          .map(([key, count]) => `${key}: ${count}`),
      },
    },
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { id } = await context.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      deactivatedAt: true,
      _count: {
        select: {
          orders: true,
          Wishlist: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: { code: "USER_NOT_FOUND", message: "Không tìm thấy người dùng" } },
      { status: 404 }
    );
  }

  const dependencyCounts = await getDependencyCounts(id);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    deactivatedAt: user.deactivatedAt,
    orderCount: user._count.orders,
    wishlistCount: user._count.Wishlist,
    dependencyCounts,
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = adminUserUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { id },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!existingUser) {
        throw new Error("USER_NOT_FOUND");
      }

      if (parsed.data.email && parsed.data.email !== existingUser.email) {
        const emailOwner = await tx.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true },
        });

        if (emailOwner && emailOwner.id !== id) {
          throw new Error("EMAIL_ALREADY_EXISTS");
        }
      }

      const removesAdminAccess =
        existingUser.role === "admin" &&
        (parsed.data.role === "user" || parsed.data.isActive === false);

      if (removesAdminAccess) {
        const adminCount = await tx.user.count({
          where: { role: "admin", isActive: true },
        });

        if (adminCount <= 1) {
          throw new Error("LAST_ADMIN_FORBIDDEN");
        }
      }

      const data: {
        email?: string;
        password?: string;
        role?: "admin" | "user";
        isActive?: boolean;
        deactivatedAt?: Date | null;
      } = {};

      if (parsed.data.email) data.email = parsed.data.email;
      if (parsed.data.role) data.role = parsed.data.role;
      if (parsed.data.password) data.password = await bcrypt.hash(parsed.data.password, 14);
      if (parsed.data.isActive !== undefined) {
        data.isActive = parsed.data.isActive;
        data.deactivatedAt = parsed.data.isActive ? null : new Date();
      }

      return tx.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          deactivatedAt: true,
        },
      });
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "USER_NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "USER_NOT_FOUND", message: "Không tìm thấy người dùng" } },
        { status: 404 }
      );
    }

    if (message === "EMAIL_ALREADY_EXISTS") {
      return NextResponse.json(
        { error: { code: "EMAIL_ALREADY_EXISTS", message: "Email đã tồn tại" } },
        { status: 409 }
      );
    }

    if (message === "LAST_ADMIN_FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "LAST_ADMIN_FORBIDDEN", message: "Không thể hạ quyền admin cuối cùng" } },
        { status: 409 }
      );
    }

    throw error;
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return PATCH(request, context);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { session, response } = await requireAdminApi();
  if (response) return response;

  const { id } = await context.params;

  if (session?.user.id === id) {
    return NextResponse.json(
      { error: { code: "SELF_DELETE_FORBIDDEN", message: "Không thể xóa tài khoản admin đang đăng nhập" } },
      { status: 409 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { id },
        select: { id: true, role: true },
      });

      if (!existingUser) {
        throw new Error("USER_NOT_FOUND");
      }

      if (existingUser.role === "admin") {
        const adminCount = await tx.user.count({ where: { role: "admin" } });

        if (adminCount <= 1) {
          throw new Error("LAST_ADMIN_FORBIDDEN");
        }
      }

      const dependencyCounts = await getDependencyCounts(id, tx);

      if (dependencyCounts.adminAuditLogCount > 0) {
        throw new Error("USER_HAS_AUDIT_HISTORY");
      }

      if (hasDependencies(dependencyCounts)) {
        throw new Error(`USER_HAS_DEPENDENCIES:${JSON.stringify(dependencyCounts)}`);
      }

      await tx.user.delete({ where: { id } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "USER_NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "USER_NOT_FOUND", message: "Không tìm thấy người dùng" } },
        { status: 404 }
      );
    }

    if (message === "LAST_ADMIN_FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "LAST_ADMIN_FORBIDDEN", message: "Không thể xóa admin cuối cùng" } },
        { status: 409 }
      );
    }

    if (message === "USER_HAS_AUDIT_HISTORY") {
      return NextResponse.json(
        {
          error: {
            code: "USER_HAS_AUDIT_HISTORY",
            message: "Tài khoản có lịch sử audit; hãy vô hiệu hóa thay vì xóa.",
          },
        },
        { status: 409 }
      );
    }

    if (message.startsWith("USER_HAS_DEPENDENCIES:")) {
      const dependencyCounts = JSON.parse(message.replace("USER_HAS_DEPENDENCIES:", ""));
      return NextResponse.json(dependencyErrorPayload(dependencyCounts), { status: 409 });
    }

    throw error;
  }
}
