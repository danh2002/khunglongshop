import { prisma } from "@/lib/prisma";
import { runOtpCleanup } from "@/lib/otp/cleanupJob";
import { sendOtpEmail } from "@/lib/email";
import {
  cleanupStaleReservations,
  consumeToken,
  maskEmail,
  normalizeOtpEmail,
  requestOtp,
  verifyOtp,
} from "@/lib/otp/otpService";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email", () => ({
  sendOtpEmail: vi.fn(),
}));

const TEST_EMAIL = "collector@example.com";
const SECOND_EMAIL = "hunter@example.com";
const TEST_IP = "127.0.0.1";
const TEST_EMAILS = [TEST_EMAIL, SECOND_EMAIL, "existing@test.com"];

async function cleanOtpData() {
  await prisma.otpAuditLog.deleteMany({});
  await prisma.otpRateLimitEvent.deleteMany({});
  await prisma.otpChallenge.deleteMany({});
}

async function cleanUsers(emails = TEST_EMAILS) {
  await prisma.user.deleteMany({
    where: {
      email: { in: emails },
    },
  });
}

async function createTestUser(email: string) {
  return prisma.user.create({
    data: {
      email,
      phone: null,
      password: "hashed",
      role: "user",
      firstName: "Test",
      lastName: "User",
    },
  });
}

async function createPendingChallenge(code: string, email = TEST_EMAIL) {
  const otpHash = await bcrypt.hash(code, 10);
  return prisma.otpChallenge.create({
    data: {
      phone: email,
      otpHash,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
  });
}

beforeEach(async () => {
  await cleanOtpData();
  await cleanUsers();
  vi.mocked(sendOtpEmail).mockResolvedValue({ success: true, messageId: "test-email-id" });
});

afterEach(async () => {
  await cleanOtpData();
  await cleanUsers();
});

describe("normalizeOtpEmail", () => {
  it("trims and lowercases email", () => {
    expect(normalizeOtpEmail(" Collector@Example.COM ")).toBe(TEST_EMAIL);
  });

  it("throws INVALID_EMAIL_FORMAT for invalid email", () => {
    expect(() => normalizeOtpEmail("not-an-email")).toThrow("INVALID_EMAIL_FORMAT");
  });
});

describe("maskEmail", () => {
  it("masks the local part and keeps the domain visible", () => {
    expect(maskEmail(TEST_EMAIL)).toBe("co***@example.com");
  });
});

describe("requestOtp", () => {
  it("happy path: returns challengeId, masked email, and sends email", async () => {
    const before = Date.now();
    const result = await requestOtp(TEST_EMAIL, TEST_IP);

    expect(result.challengeId).toBeDefined();
    expect(result.emailMasked).toBe("co***@example.com");
    expect(result.resendAfterSeconds).toBe(60);
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 9.5 * 60_000);
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 10.1 * 60_000);
    expect(sendOtpEmail).toHaveBeenCalledOnce();
    expect(sendOtpEmail).toHaveBeenCalledWith(TEST_EMAIL, expect.stringMatching(/^\d{6}$/));

    const challenge = await prisma.otpChallenge.findFirst({
      where: { phone: TEST_EMAIL },
    });
    expect(challenge?.status).toBe("PENDING");
  });

  it("within 60s: throws OTP_RESEND_NOT_READY, no new email", async () => {
    await requestOtp(TEST_EMAIL, TEST_IP);
    vi.clearAllMocks();

    await expect(requestOtp(TEST_EMAIL, TEST_IP)).rejects.toMatchObject({
      code: "OTP_RESEND_NOT_READY",
      meta: expect.objectContaining({
        emailMasked: "co***@example.com",
      }),
    });

    expect(sendOtpEmail).not.toHaveBeenCalled();
    await expect(
      prisma.otpChallenge.count({ where: { phone: TEST_EMAIL } })
    ).resolves.toBe(1);
  });

  it("after 60s: old challenge EXPIRED, new email sent", async () => {
    await prisma.otpChallenge.create({
      data: {
        phone: TEST_EMAIL,
        otpHash: "oldhash",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 10 * 60_000),
        createdAt: new Date(Date.now() - 61_000),
        updatedAt: new Date(Date.now() - 61_000),
      },
    });

    const result = await requestOtp(TEST_EMAIL, TEST_IP);
    expect(result.challengeId).toBeDefined();
    expect(sendOtpEmail).toHaveBeenCalledOnce();

    const challenges = await prisma.otpChallenge.findMany({
      where: { phone: TEST_EMAIL },
      orderBy: { createdAt: "desc" },
    });
    expect(challenges[0]?.status).toBe("PENDING");
    expect(challenges[1]?.status).toBe("EXPIRED");
  });

  it("4th request in 15min: throws TOO_MANY_OTP_REQUESTS", async () => {
    await prisma.otpRateLimitEvent.createMany({
      data: [
        { key: `email:${TEST_EMAIL}`, status: "SENT" },
        { key: `email:${TEST_EMAIL}`, status: "SENT" },
        { key: `email:${TEST_EMAIL}`, status: "SENT" },
      ],
    });

    await expect(requestOtp(TEST_EMAIL, TEST_IP)).rejects.toMatchObject({
      code: "TOO_MANY_OTP_REQUESTS",
    });
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it("email provider fails: challenge EXPIRED, throws EMAIL_PROVIDER_UNAVAILABLE", async () => {
    vi.mocked(sendOtpEmail).mockResolvedValueOnce({ success: false, error: "timeout" });

    await expect(requestOtp(TEST_EMAIL, TEST_IP)).rejects.toMatchObject({
      code: "EMAIL_PROVIDER_UNAVAILABLE",
    });

    const challenge = await prisma.otpChallenge.findFirst({
      where: { phone: TEST_EMAIL },
    });
    expect(challenge?.status).toBe("EXPIRED");
  });

  it("email already registered: throws EMAIL_ALREADY_EXISTS", async () => {
    await createTestUser(TEST_EMAIL);

    await expect(requestOtp(TEST_EMAIL, TEST_IP)).rejects.toMatchObject({
      code: "EMAIL_ALREADY_EXISTS",
    });
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it("invalid email: throws INVALID_EMAIL_FORMAT", async () => {
    await expect(requestOtp("bad-email", TEST_IP)).rejects.toMatchObject({
      code: "INVALID_EMAIL_FORMAT",
    });
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it("10 FAILED from IP: throws PROVIDER_FAILURE_THROTTLE", async () => {
    await prisma.otpRateLimitEvent.createMany({
      data: Array.from({ length: 10 }, () => ({
        key: `ip:${TEST_IP}`,
        status: "FAILED" as const,
      })),
    });

    await expect(requestOtp(TEST_EMAIL, TEST_IP)).rejects.toMatchObject({
      code: "PROVIDER_FAILURE_THROTTLE",
    });
  });
});

describe("verifyOtp", () => {
  let challengeId: string;
  const CORRECT_CODE = "123456";

  beforeEach(async () => {
    const challenge = await createPendingChallenge(CORRECT_CODE);
    challengeId = challenge.id;
  });

  it("correct OTP: returns token, status VERIFIED", async () => {
    const result = await verifyOtp(challengeId, CORRECT_CODE);

    expect(result.token).toBeDefined();
    expect(result.tokenExpiry).toBeInstanceOf(Date);

    const challenge = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    expect(challenge?.status).toBe("VERIFIED");
  });

  it("wrong OTP x4: INVALID_OTP, attempts=4", async () => {
    for (let i = 0; i < 4; i += 1) {
      await expect(verifyOtp(challengeId, "000000")).rejects.toMatchObject({
        code: "INVALID_OTP",
      });
    }

    const challenge = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    expect(challenge?.attempts).toBe(4);
    expect(challenge?.status).toBe("PENDING");
  });

  it("wrong OTP x5: status LOCKED, throws CHALLENGE_LOCKED", async () => {
    for (let i = 0; i < 4; i += 1) {
      await expect(verifyOtp(challengeId, "000000")).rejects.toMatchObject({
        code: "INVALID_OTP",
      });
    }

    await expect(verifyOtp(challengeId, "000000")).rejects.toMatchObject({
      code: "CHALLENGE_LOCKED",
    });

    const challenge = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    expect(challenge?.status).toBe("LOCKED");
  });

  it("expired challenge: throws CHALLENGE_EXPIRED, marks EXPIRED", async () => {
    await prisma.otpChallenge.update({
      where: { id: challengeId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(verifyOtp(challengeId, CORRECT_CODE)).rejects.toMatchObject({
      code: "CHALLENGE_EXPIRED",
    });

    const challenge = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    expect(challenge?.status).toBe("EXPIRED");
  });

  it("re-verify VERIFIED (network retry): returns new token", async () => {
    const first = await verifyOtp(challengeId, CORRECT_CODE);
    const second = await verifyOtp(challengeId, CORRECT_CODE);

    expect(second.token).toBeDefined();
    expect(second.token).not.toBe(first.token);
  });

  it("not found: throws OTP_NOT_FOUND", async () => {
    await expect(verifyOtp("nonexistent-id", CORRECT_CODE)).rejects.toMatchObject({
      code: "OTP_NOT_FOUND",
    });
  });
});

describe("consumeToken", () => {
  let challengeId: string;
  let validToken: string;
  const CORRECT_CODE = "654321";

  beforeEach(async () => {
    const challenge = await createPendingChallenge(CORRECT_CODE);
    challengeId = challenge.id;
    const result = await verifyOtp(challengeId, CORRECT_CODE);
    validToken = result.token;
  });

  it("happy path: status becomes CONSUMED and returns email", async () => {
    const result = await prisma.$transaction(async (tx) => {
      return consumeToken(tx, challengeId, validToken);
    });

    expect(result.email).toBe(TEST_EMAIL);
    const challenge = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    expect(challenge?.status).toBe("CONSUMED");
  });

  it("expired tokenExpiry: throws EMAIL_VERIFICATION_EXPIRED", async () => {
    await prisma.otpChallenge.update({
      where: { id: challengeId },
      data: { tokenExpiry: new Date(Date.now() - 1000) },
    });

    await expect(
      prisma.$transaction(async (tx) => consumeToken(tx, challengeId, validToken))
    ).rejects.toMatchObject({ code: "EMAIL_VERIFICATION_EXPIRED" });
  });

  it("wrong token: throws INVALID_TOKEN", async () => {
    await expect(
      prisma.$transaction(async (tx) => consumeToken(tx, challengeId, "wrong-token"))
    ).rejects.toMatchObject({ code: "INVALID_TOKEN" });
  });

  it("already consumed: throws TOKEN_ALREADY_CONSUMED", async () => {
    await prisma.$transaction(async (tx) => {
      await consumeToken(tx, challengeId, validToken);
    });

    await expect(
      prisma.$transaction(async (tx) => consumeToken(tx, challengeId, validToken))
    ).rejects.toMatchObject({ code: "TOKEN_ALREADY_CONSUMED" });
  });
});

describe("cleanupStaleReservations", () => {
  it("RESERVED older than 2min -> FAILED_STALE", async () => {
    await prisma.otpRateLimitEvent.create({
      data: {
        key: `email:${TEST_EMAIL}`,
        status: "RESERVED",
        createdAt: new Date(Date.now() - 3 * 60_000),
      },
    });

    const result = await cleanupStaleReservations();
    expect(result.count).toBe(1);

    const event = await prisma.otpRateLimitEvent.findFirst();
    expect(event?.status).toBe("FAILED_STALE");
  });
});

describe("runOtpCleanup", () => {
  it("Phase 0: RESERVED older than 2min -> FAILED_STALE", async () => {
    await prisma.otpRateLimitEvent.create({
      data: {
        key: `email:${TEST_EMAIL}`,
        status: "RESERVED",
        createdAt: new Date(Date.now() - 3 * 60_000),
      },
    });

    const result = await runOtpCleanup();
    expect(result.staleReserved).toBe(1);

    const event = await prisma.otpRateLimitEvent.findFirst();
    expect(event?.status).toBe("FAILED_STALE");
  });

  it("Phase 1: PENDING past expiresAt -> EXPIRED", async () => {
    await prisma.otpChallenge.create({
      data: {
        phone: TEST_EMAIL,
        otpHash: "x",
        status: "PENDING",
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const result = await runOtpCleanup();
    expect(result.expiredPending).toBe(1);
  });

  it("Phase 1: VERIFIED past tokenExpiry -> EXPIRED", async () => {
    await prisma.otpChallenge.create({
      data: {
        phone: TEST_EMAIL,
        otpHash: "x",
        status: "VERIFIED",
        expiresAt: new Date(Date.now() + 60_000),
        tokenExpiry: new Date(Date.now() - 1000),
      },
    });

    const result = await runOtpCleanup();
    expect(result.expiredVerified).toBe(1);
  });

  it("Phase 2: terminal challenges older than 7 days -> deleted", async () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60_000);
    await prisma.otpChallenge.create({
      data: {
        phone: TEST_EMAIL,
        otpHash: "x",
        status: "CONSUMED",
        expiresAt: old,
        createdAt: old,
        updatedAt: old,
      },
    });

    const result = await runOtpCleanup();
    expect(result.deletedChallenges).toBe(1);
  });

  it("Phase 3: OtpAuditLog older than 90 days -> deleted", async () => {
    const old = new Date(Date.now() - 91 * 24 * 60 * 60_000);
    await prisma.otpAuditLog.create({
      data: {
        phoneMasked: "co***@example.com",
        event: "REQUEST",
        ip: TEST_IP,
        challengeId: "old-id",
        createdAt: old,
      },
    });

    const result = await runOtpCleanup();
    expect(result.deletedAuditRows).toBe(1);
  });

  it("Phase 4: OtpRateLimitEvent older than 7 days -> deleted", async () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60_000);
    await prisma.otpRateLimitEvent.create({
      data: { key: `email:${TEST_EMAIL}`, status: "SENT", createdAt: old },
    });

    const result = await runOtpCleanup();
    expect(result.deletedRateLimitEvents).toBe(1);
  });
});
