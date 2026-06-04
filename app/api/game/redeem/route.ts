import { NextRequest, NextResponse } from "next/server";
import prisma from "@/utils/db";

type RateBucket = {
  count: number;
  resetAt: number;
};

const rateBuckets = new Map<string, RateBucket>();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > MAX_REQUESTS;
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-game-api-key");

  if (!apiKey || apiKey !== process.env.GAME_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const rewardCode = body?.reward_code;
  const playerId = body?.player_id;

  if (!rewardCode || !playerId) {
    return NextResponse.json({ error: "reward_code and player_id are required" }, { status: 400 });
  }

  const setReward = await prisma.setReward.findUnique({
    where: { rewardCode },
    include: { set: true },
  });

  if (!setReward) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }

  if (setReward.isClaimed) {
    return NextResponse.json(
      { error: "Code already claimed", claimedAt: setReward.claimedAt },
      { status: 409 }
    );
  }

  const updatedReward = await prisma.setReward.update({
    where: { id: setReward.id },
    data: {
      isClaimed: true,
      claimedAt: new Date(),
    },
    include: { set: true },
  });

  return NextResponse.json({
    success: true,
    reward_type: updatedReward.set.rewardCodeTemplate ?? "collector_complete",
    reward_data: {
      set_name: updatedReward.set.name,
      set_id: updatedReward.set.id,
      player_id: playerId,
      granted_at: updatedReward.grantedAt,
    },
  });
}
