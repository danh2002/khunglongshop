import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import {
  cancelOrder,
  OrderCancellationError,
} from "@/lib/orderCancellation";
import { authOptions } from "@/utils/authOptions";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const order = await cancelOrder({ orderId: id, ownerId: userId });
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof OrderCancellationError) {
      const status = error.code === "ORDER_NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: error.code }, { status });
    }
    throw error;
  }
}

