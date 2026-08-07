import { NextRequest, NextResponse } from "next/server";
import { expireDuePaymentOrders } from "@/lib/paymentExpiry";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const result = await expireDuePaymentOrders(new Date(), 50);
  return NextResponse.json({ success: true, ...result });
}
