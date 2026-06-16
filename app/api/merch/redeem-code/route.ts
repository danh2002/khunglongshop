import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { CollectorRedeemError, redeemProductCodeForUser } from "@/lib/collectorService";
import { isRateLimited } from "@/lib/rateLimit";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

const redeemCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "code is required")
    .max(64, "code is too long")
    .transform((value) => value.toUpperCase()),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });

  if (!user?.isActive || user.role !== "user") {
    return NextResponse.json({ error: "REDEEM_ROLE_NOT_ALLOWED" }, { status: 403 });
  }

  if (isRateLimited(`redeem-code:${userId}`, 10)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = redeemCodeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  try {
    const result = await redeemProductCodeForUser(parsed.data.code, userId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CollectorRedeemError) {
      if (error.code === "ALREADY_USED_OR_NOT_OWNED") {
        return NextResponse.json(
          { error: "Code already used, disabled, or owned by another user" },
          { status: 409 }
        );
      }

      if (error.code === "INVALID_COLLECTOR_ITEM") {
        return NextResponse.json({ error: "Invalid collector item" }, { status: 422 });
      }

      return NextResponse.json(
        { error: "CODE_NOT_FOUND_OR_UNAUTHORIZED" },
        { status: 404 }
      );
    }

    console.error("Redeem code failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
