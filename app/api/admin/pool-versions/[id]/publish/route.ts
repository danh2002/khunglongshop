import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { adminError } from "@/lib/adminResponses";
import { publishBlindBoxPoolVersion } from "@/lib/poolPublication";
import { requireAdminApi } from "@/utils/adminAuth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdminApi();
  if (response || !session) return response;
  const { id } = await params;

  try {
    const active = await publishBlindBoxPoolVersion(id, session.user.id);
    revalidateTag("rarity-data");
    revalidatePath("/product/vanie-blind-box");

    return NextResponse.json(active, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status =
      code === "POOL_VERSION_NOT_FOUND"
        ? 404
        : code === "INVALID_POOL_VERSION"
          ? 422
          : 409;
    return adminError(status, code || "POOL_PUBLISH_FAILED", "Không thể xuất bản phiên bản tỷ lệ.");
  }
}
