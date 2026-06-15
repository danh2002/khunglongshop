import { verifyOtp, OtpServiceError } from "@/lib/otp/otpService";
import { NextResponse } from "next/server";
import { z } from "zod";

const verifyOtpSchema = z.object({
  challengeId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

function errorResponse(error: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ ...details, error }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", 422, {
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await verifyOtp(parsed.data.challengeId, parsed.data.code);

    return NextResponse.json({
      token: result.token,
      tokenExpiry: result.tokenExpiry,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("INVALID_JSON", 400);
    }

    if (error instanceof OtpServiceError) {
      return errorResponse(error.code, error.status, error.meta);
    }

    console.error("OTP verify failed", error);
    return errorResponse("INTERNAL_SERVER_ERROR", 500);
  }
}
