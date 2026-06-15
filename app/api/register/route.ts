import { consumeToken, OtpServiceError } from "@/lib/otp/otpService";
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
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().max(80),
  phone: z.string().trim().optional().default(""),
  challengeId: z.string().min(1),
  token: z.string().min(1),
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
    const firstName = parsed.data.firstName.trim();
    const lastName = parsed.data.lastName.trim();
    const hashedPassword = await bcrypt.hash(parsed.data.password, 14);

    if (process.env.SKIP_OTP === "true" && parsed.data.challengeId === "SKIP_OTP_DEV") {
      await prisma.user.create({
        data: {
          id: nanoid(),
          email,
          phone: parsed.data.phone.trim() || null,
          firstName,
          lastName,
          password: hashedPassword,
          role: "user",
        },
      });

      return NextResponse.json({ message: "Tài khoản đã được tạo" }, { status: 201 });
    }

    await prisma.$transaction(async (tx) => {
      const { phone } = await consumeToken(tx, parsed.data.challengeId, parsed.data.token);

      await tx.user.create({
        data: {
          id: nanoid(),
          email,
          phone,
          firstName,
          lastName,
          password: hashedPassword,
          role: "user",
        },
      });
    });

    return NextResponse.json({ message: "Tài khoản đã được tạo" }, { status: 201 });
  } catch (error) {
    if (error instanceof OtpServiceError) {
      return errorResponse(error.code, error.status, error.meta);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      if (isUniqueTarget(error, "email")) {
        return errorResponse("EMAIL_ALREADY_EXISTS", 409);
      }

      if (isUniqueTarget(error, "phone")) {
        return errorResponse("PHONE_ALREADY_REGISTERED", 409, {
          loginUrl: "/login",
        });
      }
    }

    if (error instanceof SyntaxError) {
      return errorResponse("INVALID_JSON", 400);
    }

    console.error("Registration failed", error);
    return errorResponse("INTERNAL_SERVER_ERROR", 500);
  }
}
