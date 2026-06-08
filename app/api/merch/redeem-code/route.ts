import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { CollectorRedeemError, redeemProductCodeForUser } from "@/lib/collectorService";
import { authOptions } from "@/utils/authOptions";

type RateBucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 15;
const rateBuckets = new Map<string, RateBucket>();

const redeemCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "code is required")
    .max(64, "code is too long")
    .transform((value) => value.toUpperCase()),
});

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > MAX_REQUESTS;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateKey = `${userId}:${getClientIp(request)}`;

  if (isRateLimited(rateKey)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = redeemCodeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  try {
    const result = await redeemProductCodeForUser(parsed.data.code, userId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof CollectorRedeemError) {
      if (error.code === "ALREADY_USED") {
        return NextResponse.json({ error: "Code already used" }, { status: 409 });
      }

      if (error.code === "INVALID_COLLECTOR_ITEM") {
        return NextResponse.json({ error: "Invalid collector item" }, { status: 422 });
      }

      return NextResponse.json({ error: "Code not found" }, { status: 404 });
    }

    console.error("Redeem code failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
