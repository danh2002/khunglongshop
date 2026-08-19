import { NextResponse } from "next/server";
import { adminError } from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const result = await prisma.$transaction(async (tx) => {
    const code = await tx.redemptionCode.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        usedAt: true,
        allocationId: true,
      },
    });

    if (!code) return { ok: false as const, error: "CODE_NOT_FOUND" as const };

    if (code.status === "ACTIVE" && code.usedAt === null) {
      const updated = await tx.redemptionCode.updateMany({
        where: { id, status: "ACTIVE", usedAt: null },
        data: { status: "DISABLED", isUsed: false },
      });
      return updated.count === 1
        ? { ok: true as const }
        : { ok: false as const, error: "CODE_UPDATE_CONFLICT" as const };
    }

    if (code.status === "REDEEMED") {
      const updated = await tx.redemptionCode.updateMany({
        where: { id, status: "REDEEMED" },
        data: {
          status: "DISABLED",
          isUsed: false,
          usedAt: null,
          allocationId: null,
        },
      });

      if (updated.count !== 1) {
        return { ok: false as const, error: "CODE_UPDATE_CONFLICT" as const };
      }

      if (code.allocationId) {
        await tx.blindBoxAllocation.delete({
          where: { id: code.allocationId },
        });
      }

      return { ok: true as const };
    }

    return { ok: false as const, error: "CODE_NOT_DISABLEABLE" as const };
  });

  if (!result.ok) {
    if (result.error === "CODE_NOT_FOUND") {
      return adminError(404, "CODE_NOT_FOUND", "Khong tim thay ma.");
    }

    return adminError(
      409,
      "CODE_NOT_ACTIVE",
      "Chi ma ACTIVE chua dung hoac ma REDEEMED moi co the vo hieu hoa."
    );
  }

  return NextResponse.json({ success: true });
}
