import prisma from "@/utils/db";
import { commonValidations, sanitizeInput } from "@/utils/validation";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";

const registerSchema = z.object({
  email: commonValidations.email,
  password: commonValidations.password,
  fullName: z.string().trim().min(1).max(160).optional(),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
});

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function errorResponse(error: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ ...details, error }, { status });
}

function isUniqueTarget(error: Prisma.PrismaClientKnownRequestError, field: string) {
  const target = error.meta?.target;
  return Array.isArray(target) && target.includes(field);
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "",
  };
}

export async function POST(request: Request) {
  try {
    const clientIP = getClientIp(request);
    if (!commonValidations.checkRateLimit(clientIP, 5, 15 * 60 * 1000)) {
      return errorResponse("REGISTRATION_RATE_LIMITED", 429);
    }

    const body = await sanitizeInput.validateJsonInput(request);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", 422, {
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const nameParts = parsed.data.fullName
      ? splitFullName(parsed.data.fullName)
      : {
          firstName: parsed.data.firstName?.trim() ?? "",
          lastName: parsed.data.lastName?.trim() ?? "",
        };
    const hashedPassword = await bcrypt.hash(parsed.data.password, 14);

    await prisma.user.create({
      data: {
        id: nanoid(),
        email,
        phone: null,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        password: hashedPassword,
        role: "user",
      },
    });

    return NextResponse.json({ message: "Tài khoản đã được tạo" }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      if (isUniqueTarget(error, "email")) {
        return errorResponse("EMAIL_ALREADY_EXISTS", 409);
      }
    }

    if (error instanceof SyntaxError) {
      return errorResponse("INVALID_JSON", 400);
    }

    console.error("Registration failed", error);
    return errorResponse("INTERNAL_SERVER_ERROR", 500);
  }
}
