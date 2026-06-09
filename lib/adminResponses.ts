import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function adminError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>
) {
  return NextResponse.json(
    { error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } },
    { status }
  );
}

export function validationError(error: ZodError) {
  return adminError(
    400,
    "VALIDATION_ERROR",
    "Dữ liệu không hợp lệ.",
    error.flatten().fieldErrors as Record<string, string[]>
  );
}

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isPrismaUniqueError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
