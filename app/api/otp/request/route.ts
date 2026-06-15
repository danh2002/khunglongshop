import { requestOtp, OtpServiceError } from "@/lib/otp/otpService";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestOtpSchema = z.object({
  phone: z.string().min(1),
});

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function errorResponse(error: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ ...details, error }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestOtpSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", 422, {
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await requestOtp(parsed.data.phone, getClientIp(request));

    return NextResponse.json({
      challengeId: result.challengeId,
      expiresAt: result.expiresAt,
      resendAfterSeconds: result.resendAfterSeconds,
      phoneMasked: result.phoneMasked,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("INVALID_JSON", 400);
    }

    if (error instanceof OtpServiceError) {
      return errorResponse(error.code, error.status, error.meta);
    }

    console.error("OTP request failed", error);
    return errorResponse("INTERNAL_SERVER_ERROR", 500);
  }
}
