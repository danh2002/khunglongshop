import { getServerSession } from "next-auth/next";
import { NextRequest } from "next/server";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const sendUnreadCount = async () => {
        const unreadCount = await prisma.notification.count({
          where: { userId, isRead: false },
        });
        send({ unreadCount });
      };

      await sendUnreadCount();

      const interval = setInterval(async () => {
        try {
          await sendUnreadCount();
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 60_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
