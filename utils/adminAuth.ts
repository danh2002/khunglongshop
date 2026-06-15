import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { adminError } from "@/lib/adminResponses";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

async function getActiveAdmin(userId: string) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      role: "admin",
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
    },
  });
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const admin = await getActiveAdmin(session.user.id);

  if (!admin) {
    redirect("/");
  }

  return { session, admin };
}

export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;
  return Boolean(await getActiveAdmin(session.user.id));
}

export async function requireAdminApi() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      session: null,
      admin: null,
      response: adminError(401, "UNAUTHORIZED", "Bạn cần đăng nhập."),
    };
  }

  const admin = await getActiveAdmin(session.user.id);

  if (!admin) {
    return {
      session: null,
      admin: null,
      response: adminError(403, "FORBIDDEN", "Bạn không có quyền quản trị."),
    };
  }

  return { session, admin, response: null };
}
