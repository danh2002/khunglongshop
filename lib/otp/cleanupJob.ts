import prisma from "@/utils/db";

export async function runOtpCleanup() {
  const now = new Date();
  const results = {
    staleReserved: 0,
    expiredPending: 0,
    expiredVerified: 0,
    deletedChallenges: 0,
    deletedAuditRows: 0,
    deletedRateLimitEvents: 0,
    ranAt: now.toISOString(),
  };

  // Phase 0: RESERVED older than 2min -> FAILED_STALE
  const p0 = await prisma.otpRateLimitEvent.updateMany({
    where: {
      status: "RESERVED",
      createdAt: { lt: new Date(now.getTime() - 2 * 60_000) },
    },
    data: { status: "FAILED_STALE" },
  });
  results.staleReserved = p0.count;

  // Phase 1a: PENDING past expiresAt -> EXPIRED
  const p1a = await prisma.otpChallenge.updateMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });
  results.expiredPending = p1a.count;

  // Phase 1b: VERIFIED past tokenExpiry -> EXPIRED
  const p1b = await prisma.otpChallenge.updateMany({
    where: { status: "VERIFIED", tokenExpiry: { lt: now } },
    data: { status: "EXPIRED" },
  });
  results.expiredVerified = p1b.count;

  // Phase 2: Delete terminal challenges older than 7 days
  const p2 = await prisma.otpChallenge.deleteMany({
    where: {
      status: { in: ["CONSUMED", "EXPIRED", "LOCKED"] },
      updatedAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60_000) },
    },
  });
  results.deletedChallenges = p2.count;

  // Phase 3: Delete OtpAuditLog older than 90 days
  const p3 = await prisma.otpAuditLog.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - 90 * 24 * 60 * 60_000) } },
  });
  results.deletedAuditRows = p3.count;

  // Phase 4: Delete OtpRateLimitEvent older than 7 days
  const p4 = await prisma.otpRateLimitEvent.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60_000) } },
  });
  results.deletedRateLimitEvents = p4.count;

  console.log("[OTP Cleanup]", results);
  return results;
}
