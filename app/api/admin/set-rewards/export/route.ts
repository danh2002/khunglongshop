import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/utils/db";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if ((session as any)?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rewards = await prisma.setReward.findMany({
    orderBy: { grantedAt: "desc" },
    include: { set: true },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(rewards.map((reward) => reward.userId))] } },
    select: { id: true, email: true },
  });
  const userById = new Map(users.map((user) => [user.id, user]));
  const rows = [
    ["rewardCode", "setName", "userEmail", "grantedAt", "isClaimed", "claimedAt"],
    ...rewards.map((reward) => [
      reward.rewardCode,
      reward.set.name,
      userById.get(reward.userId)?.email || reward.userId,
      reward.grantedAt.toISOString(),
      reward.isClaimed,
      reward.claimedAt?.toISOString() || "",
    ]),
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="set-rewards.csv"',
    },
  });
}
