import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import {
  AdminUserMutationError,
  runSerializableAdminUserMutation,
} from "@/lib/adminUserMutations";
import { adminError, isPrismaUniqueError, validationError } from "@/lib/adminResponses";
import { adminUserUpdateSchema } from "@/lib/adminUserValidation";
import type { UserDependencyCounts } from "@/lib/adminUsers";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PrismaLike = typeof prisma | Prisma.TransactionClient;

async function getDependencyCounts(
  userId: string,
  client: PrismaLike = prisma
): Promise<UserDependencyCounts> {
  const [
    orderCount,
    wishlistCount,
    notificationCount,
    bulkUploadBatchCount,
    redemptionCodeCount,
    setRewardCount,
    adminAuditLogCount,
    blindBoxAllocationCount,
  ] = await Promise.all([
    client.customer_order.count({ where: { userId } }),
    client.wishlist.count({ where: { userId } }),
    client.notification.count({ where: { userId } }),
    client.bulk_upload_batch.count({ where: { userId } }),
    client.redemptionCode.count({ where: { userId } }),
    client.setReward.count({ where: { userId } }),
    client.adminAuditLog.count({ where: { actorId: userId } }),
    client.blindBoxAllocation.count({ where: { userId } }),
  ]);

  return {
    orderCount,
    wishlistCount,
    notificationCount,
    bulkUploadBatchCount,
    redemptionCodeCount,
    setRewardCount,
    adminAuditLogCount,
    blindBoxAllocationCount,
  };
}

function hasDependencies(counts: UserDependencyCounts) {
  return Object.values(counts).some((count) => count > 0);
}

function mutationErrorResponse(error: AdminUserMutationError) {
  const responses = {
    USER_NOT_FOUND: [404, "Không tìm thấy người dùng."],
    EMAIL_ALREADY_EXISTS: [409, "Email đã tồn tại."],
    SELF_ACCESS_CHANGE_FORBIDDEN: [
      409,
      "Không thể tự hạ quyền hoặc vô hiệu hóa tài khoản đang đăng nhập.",
    ],
    LAST_ADMIN_FORBIDDEN: [
      409,
      "Không thể thay đổi admin hoạt động cuối cùng.",
    ],
    USER_HAS_DEPENDENCIES: [
      409,
      "Không thể xóa người dùng còn dữ liệu liên quan.",
    ],
    USER_HAS_AUDIT_HISTORY: [
      409,
      "Tài khoản có lịch sử audit; hãy vô hiệu hóa thay vì xóa.",
    ],
  } as const;
  const [status, message] = responses[error.code];

  return adminError(status, error.code, message, undefined, error.details);
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
    return adminError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.");
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
  const { session, response } = await requireAdminApi();
  if (response) return response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = adminUserUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const password = parsed.data.password
    ? await bcrypt.hash(parsed.data.password, 14)
    : undefined;

  try {
    const updatedUser = await runSerializableAdminUserMutation(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { id },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!existingUser) {
        throw new AdminUserMutationError("USER_NOT_FOUND");
      }

      const removesAdminAccess =
        existingUser.role === "admin" &&
        (parsed.data.role === "user" || parsed.data.isActive === false);

      if (session!.user.id === id && removesAdminAccess) {
        throw new AdminUserMutationError("SELF_ACCESS_CHANGE_FORBIDDEN");
      }

      if (removesAdminAccess) {
        const activeAdminCount = await tx.user.count({
          where: { role: "admin", isActive: true },
        });

        if (activeAdminCount <= 1) {
          throw new AdminUserMutationError("LAST_ADMIN_FORBIDDEN");
        }
      }

      if (parsed.data.email && parsed.data.email !== existingUser.email) {
        const emailOwner = await tx.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true },
        });

        if (emailOwner && emailOwner.id !== id) {
          throw new AdminUserMutationError("EMAIL_ALREADY_EXISTS");
        }
      }

      const data: Prisma.UserUpdateInput = {};
      if (parsed.data.email) data.email = parsed.data.email;
      if (parsed.data.role) data.role = parsed.data.role;
      if (password) data.password = password;
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
    if (error instanceof AdminUserMutationError) {
      return mutationErrorResponse(error);
    }
    if (isPrismaUniqueError(error)) {
      return adminError(409, "EMAIL_ALREADY_EXISTS", "Email đã tồn tại.");
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

  if (session!.user.id === id) {
    return adminError(
      409,
      "SELF_DELETE_FORBIDDEN",
      "Không thể xóa tài khoản admin đang đăng nhập."
    );
  }

  try {
    await runSerializableAdminUserMutation(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { id },
        select: { id: true, role: true, isActive: true },
      });

      if (!existingUser) {
        throw new AdminUserMutationError("USER_NOT_FOUND");
      }

      if (existingUser.role === "admin" && existingUser.isActive) {
        const activeAdminCount = await tx.user.count({
          where: { role: "admin", isActive: true },
        });

        if (activeAdminCount <= 1) {
          throw new AdminUserMutationError("LAST_ADMIN_FORBIDDEN");
        }
      }

      const dependencyCounts = await getDependencyCounts(id, tx);
      const details = { dependencyCounts };

      if (dependencyCounts.adminAuditLogCount > 0) {
        throw new AdminUserMutationError("USER_HAS_AUDIT_HISTORY", details);
      }

      if (hasDependencies(dependencyCounts)) {
        throw new AdminUserMutationError("USER_HAS_DEPENDENCIES", details);
      }

      await tx.user.delete({ where: { id } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AdminUserMutationError) {
      return mutationErrorResponse(error);
    }
    throw error;
  }
}
