import { runOtpCleanup } from "@/lib/otp/cleanupJob";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const results = await runOtpCleanup();
  return NextResponse.json({ success: true, ...results });
}
