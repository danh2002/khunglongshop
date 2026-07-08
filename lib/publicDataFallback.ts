function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function warnPublicDataFallback(scope: string, message: string, error: unknown) {
  const code = getErrorCode(error);
  console.warn(`[${scope}] ${message}${code ? ` (${code})` : ""}`);
}
