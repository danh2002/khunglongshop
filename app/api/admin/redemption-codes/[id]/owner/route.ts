import { NextResponse } from "next/server";
import { z } from "zod";
import { adminError, validationError } from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

const ownerSchema = z.object({
  userId: z.string().min(1).nullable(),
  reason: z.string().trim().min(3).max(500),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const parsed = ownerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const { id } = await params;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const code = await tx.redemptionCode.findUnique({
        where: { id },
        select: { id: true, userId: true, status: true, usedAt: true },
      });
      if (!code) throw new Error("CODE_NOT_FOUND");
      if (code.status !== "ACTIVE" || code.usedAt) throw new Error("CODE_OWNER_LOCKED");

      if (parsed.data.userId) {
        const target = await tx.user.findUnique({
          where: { id: parsed.data.userId },
          select: { id: true, role: true },
        });
        if (!target) throw new Error("USER_NOT_FOUND");
        if (target.role !== "user") throw new Error("INVALID_CODE_OWNER_ROLE");
      }

      const next = await tx.redemptionCode.update({
        where: { id },
        data: { userId: parsed.data.userId },
      });
      const action = code.userId
        ? parsed.data.userId
          ? "REDEMPTION_CODE_OWNER_CHANGED"
          : "REDEMPTION_CODE_OWNER_CLEARED"
        : "REDEMPTION_CODE_OWNER_ASSIGNED";
      await tx.adminAuditLog.create({
        data: {
          actorId: session!.user.id,
          action,
          entityType: "RedemptionCode",
          entityId: id,
          metadata: {
            previousUserId: code.userId,
            newUserId: parsed.data.userId,
            reason: parsed.data.reason,
            actorId: session!.user.id,
          },
        },
      });
      return next;
    });
    return NextResponse.json(updated);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "CODE_NOT_FOUND") return adminError(404, code, "Không tìm thấy mã.");
    if (code === "USER_NOT_FOUND") return adminError(404, code, "Không tìm thấy user đích.");
    if (code === "INVALID_CODE_OWNER_ROLE") {
      return adminError(400, code, "Không thể gán mã cho tài khoản admin.");
    }
    if (code === "CODE_OWNER_LOCKED") {
      return adminError(409, code, "Mã đã dùng hoặc bị vô hiệu hóa nên không thể đổi owner.");
    }
    throw error;
  }
}
