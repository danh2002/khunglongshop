import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminError, validationError } from "@/lib/adminResponses";
import { publishBlindBoxPoolVersion } from "@/lib/poolPublication";
import { requireAdminApi } from "@/utils/adminAuth";

const requestSchema = z.object({
  poolVersionId: z.string().trim().min(1),
});

export async function PATCH(request: Request) {
  const { session, response } = await requireAdminApi();
  if (response || !session) return response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const active = await publishBlindBoxPoolVersion(
      parsed.data.poolVersionId,
      session.user.id
    );
    revalidateTag("rarity-data");
    revalidatePath("/product/vanie-blind-box");
    return NextResponse.json(active, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "POOL_PUBLISH_FAILED";
    const status =
      code === "POOL_VERSION_NOT_FOUND"
        ? 404
        : code === "INVALID_POOL_VERSION"
          ? 422
          : 409;
    return adminError(
      status,
      code,
      "Không thể xuất bản phiên bản tỷ lệ."
    );
  }
}
