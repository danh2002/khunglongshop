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
  const result = await prisma.redemptionCode.updateMany({
    where: { id, status: "ACTIVE", usedAt: null },
    data: { status: "DISABLED", isUsed: false },
  });
  if (result.count !== 1) {
    return adminError(409, "CODE_NOT_ACTIVE", "Chỉ mã ACTIVE chưa dùng mới có thể vô hiệu hóa.");
  }
  return NextResponse.json({ success: true });
}
