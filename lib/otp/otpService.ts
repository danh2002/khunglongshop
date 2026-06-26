import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes, randomInt } from "crypto";
import prisma from "@/utils/db";
import { sendOtpEmail } from "@/lib/email";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

type OtpErrorMeta = Record<string, unknown>;

export class OtpServiceError extends Error {
  code: string;
  status: number;
  meta?: OtpErrorMeta;

  constructor(code: string, status: number, meta?: OtpErrorMeta) {
    super(code);
    this.name = "OtpServiceError";
    this.code = code;
    this.status = status;
    this.meta = meta;
  }
}

type RequestOtpResult = {
  challengeId: string;
  expiresAt: Date;
  resendAfterSeconds: number;
  emailMasked: string;
};

type VerifyOtpResult = {
  token: string;
  tokenExpiry: Date;
};

type ConsumeTokenResult = {
  email: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 15 * 60 * 1000;
const RESEND_WINDOW_MS = 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const STALE_RESERVATION_MS = 2 * 60 * 1000;
const OTP_ATTEMPT_LIMIT = 5;
const BCRYPT_ROUNDS = 10;

function nowMinus(ms: number) {
  return new Date(Date.now() - ms);
}

function futureDate(ms: number) {
  return new Date(Date.now() + ms);
}

export function normalizeOtpEmail(email: string) {
  const normalized = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(normalized)) {
    throw new OtpServiceError("INVALID_EMAIL_FORMAT", 422);
  }

  return normalized;
}

export function maskEmail(email: string) {
  const normalized = normalizeOtpEmail(email);
  const [localPart, domain] = normalized.split("@");
  const visibleLocal = localPart.length <= 2 ? localPart[0] : `${localPart.slice(0, 2)}***`;
  return `${visibleLocal}@${domain}`;
}

function generateOtpCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function generateToken() {
  return randomBytes(32).toString("hex");
}

async function assertEmailIsAvailable(email: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM \`User\`
    WHERE email = ${email}
    LIMIT 1
  `;

  if (rows.length > 0) {
    throw new OtpServiceError("EMAIL_ALREADY_EXISTS", 409);
  }
}

async function writeAuditLog(
  client: PrismaLike,
  event: string,
  email: string,
  ip: string,
  challengeId: string
) {
  await client.otpAuditLog.create({
    data: {
      event,
      phoneMasked: maskEmail(email),
      ip,
      challengeId,
    },
  });
}

export async function cleanupStaleReservations(client: PrismaLike = prisma) {
  return client.otpRateLimitEvent.updateMany({
    where: {
      status: "RESERVED",
      createdAt: {
        lt: nowMinus(STALE_RESERVATION_MS),
      },
    },
    data: {
      status: "FAILED_STALE",
    },
  });
}

async function getExistingPendingChallengeForUpdate(
  tx: Prisma.TransactionClient,
  email: string
) {
  await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM OtpChallenge
    WHERE phone = ${email} AND status = 'PENDING'
    FOR UPDATE
  `;

  return tx.otpChallenge.findFirst({
    where: {
      phone: email,
      status: "PENDING",
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function markRateLimitEvents(
  ids: string[],
  status: "SENT" | "FAILED" | "FAILED_STALE"
) {
  if (ids.length === 0) return;

  await prisma.otpRateLimitEvent.updateMany({
    where: {
      id: {
        in: ids,
      },
    },
    data: {
      status,
    },
  });
}

async function expireChallenge(challengeId: string) {
  await prisma.otpChallenge.update({
    where: {
      id: challengeId,
    },
    data: {
      status: "EXPIRED",
    },
  });
}

export async function requestOtp(email: string, ip: string): Promise<RequestOtpResult> {
  const normalizedEmail = normalizeOtpEmail(email);
  const emailMasked = maskEmail(normalizedEmail);
  const emailKey = `email:${normalizedEmail}`;
  const ipKey = `ip:${ip}`;

  await assertEmailIsAvailable(normalizedEmail);

  const code = generateOtpCode();
  const otpHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
  const expiresAt = futureDate(OTP_TTL_MS);

  const transactionResult = await prisma.$transaction(async (tx) => {
    await cleanupStaleReservations(tx);

    const existingPending = await getExistingPendingChallengeForUpdate(tx, normalizedEmail);
    if (existingPending && existingPending.createdAt > nowMinus(RESEND_WINDOW_MS)) {
      const emailReservation = await tx.otpRateLimitEvent.create({
        data: {
          key: emailKey,
          status: "RESERVED",
        },
      });
      const ipReservation = await tx.otpRateLimitEvent.create({
        data: {
          key: ipKey,
          status: "RESERVED",
        },
      });
      await tx.otpRateLimitEvent.updateMany({
        where: {
          id: {
            in: [emailReservation.id, ipReservation.id],
          },
        },
        data: {
          status: "FAILED_STALE",
        },
      });

      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(
          (existingPending.createdAt.getTime() + RESEND_WINDOW_MS - Date.now()) / 1000
        )
      );

      return {
        kind: "coalesced" as const,
        challengeId: existingPending.id,
        expiresAt: existingPending.expiresAt,
        retryAfterSeconds,
      };
    }

    const [emailSentCount, ipSentCount, providerFailureCount] = await Promise.all([
      tx.otpRateLimitEvent.count({
        where: {
          key: emailKey,
          status: "SENT",
          createdAt: {
            gt: nowMinus(RATE_WINDOW_MS),
          },
        },
      }),
      tx.otpRateLimitEvent.count({
        where: {
          key: ipKey,
          status: "SENT",
          createdAt: {
            gt: nowMinus(RATE_WINDOW_MS),
          },
        },
      }),
      tx.otpRateLimitEvent.count({
        where: {
          key: ipKey,
          status: "FAILED",
          createdAt: {
            gt: nowMinus(RATE_WINDOW_MS),
          },
        },
      }),
    ]);

    if (emailSentCount >= 3) {
      return { kind: "error" as const, error: new OtpServiceError("TOO_MANY_OTP_REQUESTS", 429) };
    }

    if (ipSentCount >= 10) {
      return { kind: "error" as const, error: new OtpServiceError("IP_RATE_LIMITED", 429) };
    }

    if (providerFailureCount >= 10) {
      return { kind: "error" as const, error: new OtpServiceError("PROVIDER_FAILURE_THROTTLE", 503) };
    }

    if (existingPending) {
      await tx.otpChallenge.update({
        where: {
          id: existingPending.id,
        },
        data: {
          status: "EXPIRED",
        },
      });
    }

    const challenge = await tx.otpChallenge.create({
      data: {
        // OtpChallenge.phone stores the normalized email until a future schema rename.
        phone: normalizedEmail,
        otpHash,
        status: "PENDING",
        expiresAt,
        resendCount: 0,
      },
    });

    const emailReservation = await tx.otpRateLimitEvent.create({
      data: {
        key: emailKey,
        status: "RESERVED",
      },
    });
    const ipReservation = await tx.otpRateLimitEvent.create({
      data: {
        key: ipKey,
        status: "RESERVED",
      },
    });

    return {
      kind: "created" as const,
      challenge,
      reservationIds: [emailReservation.id, ipReservation.id],
    };
  });

  if (transactionResult.kind === "coalesced") {
    throw new OtpServiceError("OTP_RESEND_NOT_READY", 429, {
      challengeId: transactionResult.challengeId,
      expiresAt: transactionResult.expiresAt,
      retryAfterSeconds: transactionResult.retryAfterSeconds,
      emailMasked,
    });
  }

  if (transactionResult.kind === "error") {
    throw transactionResult.error;
  }

  const emailResult = await sendOtpEmail(normalizedEmail, code);
  if (!emailResult.success) {
    await Promise.all([
      expireChallenge(transactionResult.challenge.id),
      markRateLimitEvents(transactionResult.reservationIds, "FAILED"),
      writeAuditLog(prisma, "EXPIRED", normalizedEmail, ip, transactionResult.challenge.id),
    ]);

    throw new OtpServiceError("EMAIL_PROVIDER_UNAVAILABLE", 503, {
      error: emailResult.error,
    });
  }

  await Promise.all([
    markRateLimitEvents(transactionResult.reservationIds, "SENT"),
    writeAuditLog(prisma, "REQUEST", normalizedEmail, ip, transactionResult.challenge.id),
  ]);

  return {
    challengeId: transactionResult.challenge.id,
    expiresAt: transactionResult.challenge.expiresAt,
    resendAfterSeconds: 60,
    emailMasked,
  };
}

async function markExpired(client: PrismaLike, challengeId: string) {
  await client.otpChallenge.update({
    where: {
      id: challengeId,
    },
    data: {
      status: "EXPIRED",
    },
  });
}

async function rotateToken(challengeId: string) {
  const token = generateToken();
  const tokenExpiry = futureDate(TOKEN_TTL_MS);
  const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);

  await prisma.otpChallenge.update({
    where: {
      id: challengeId,
    },
    data: {
      status: "VERIFIED",
      tokenHash,
      tokenExpiry,
    },
  });

  return { token, tokenExpiry };
}

export async function verifyOtp(challengeId: string, code: string): Promise<VerifyOtpResult> {
  const challenge = await prisma.otpChallenge.findUnique({
    where: {
      id: challengeId,
    },
  });

  if (!challenge) {
    throw new OtpServiceError("OTP_NOT_FOUND", 404);
  }

  if (challenge.status === "PENDING" && challenge.expiresAt < new Date()) {
    await markExpired(prisma, challenge.id);
    throw new OtpServiceError("CHALLENGE_EXPIRED", 410);
  }

  if (challenge.status === "VERIFIED" && challenge.tokenExpiry && challenge.tokenExpiry < new Date()) {
    await markExpired(prisma, challenge.id);
    throw new OtpServiceError("EMAIL_VERIFICATION_EXPIRED", 410);
  }

  if (challenge.status === "LOCKED") {
    throw new OtpServiceError("CHALLENGE_LOCKED", 423);
  }

  if (challenge.status === "CONSUMED") {
    throw new OtpServiceError("TOKEN_ALREADY_CONSUMED", 410);
  }

  if (challenge.status === "EXPIRED") {
    throw new OtpServiceError("CHALLENGE_EXPIRED", 410);
  }

  if (challenge.status === "VERIFIED") {
    const isCorrect = await bcrypt.compare(code, challenge.otpHash);
    if (!isCorrect) {
      await writeAuditLog(prisma, "VERIFY_FAIL", challenge.phone, "unknown", challenge.id);
      throw new OtpServiceError("INVALID_OTP", 422);
    }

    const tokenResult = await rotateToken(challenge.id);
    await writeAuditLog(prisma, "VERIFY_OK", challenge.phone, "unknown", challenge.id);
    return tokenResult;
  }

  const isCorrect = await bcrypt.compare(code, challenge.otpHash);
  if (!isCorrect) {
    const attempts = challenge.attempts + 1;
    const nextStatus = attempts >= OTP_ATTEMPT_LIMIT ? "LOCKED" : "PENDING";
    await prisma.otpChallenge.update({
      where: {
        id: challenge.id,
      },
      data: {
        attempts,
        status: nextStatus,
      },
    });
    await writeAuditLog(
      prisma,
      nextStatus === "LOCKED" ? "LOCKED" : "VERIFY_FAIL",
      challenge.phone,
      "unknown",
      challenge.id
    );

    if (nextStatus === "LOCKED") {
      throw new OtpServiceError("CHALLENGE_LOCKED", 423);
    }

    throw new OtpServiceError("INVALID_OTP", 422, {
      attemptsRemaining: OTP_ATTEMPT_LIMIT - attempts,
    });
  }

  const tokenResult = await rotateToken(challenge.id);
  await writeAuditLog(prisma, "VERIFY_OK", challenge.phone, "unknown", challenge.id);
  return tokenResult;
}

export async function consumeToken(
  tx: Prisma.TransactionClient,
  challengeId: string,
  token: string
): Promise<ConsumeTokenResult> {
  await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM OtpChallenge
    WHERE id = ${challengeId}
    FOR UPDATE
  `;

  const challenge = await tx.otpChallenge.findUnique({
    where: {
      id: challengeId,
    },
  });

  if (!challenge) {
    throw new OtpServiceError("OTP_NOT_FOUND", 404);
  }

  if (challenge.status === "VERIFIED" && challenge.tokenExpiry && challenge.tokenExpiry < new Date()) {
    await markExpired(tx, challenge.id);
    throw new OtpServiceError("EMAIL_VERIFICATION_EXPIRED", 410);
  }

  if (challenge.status === "CONSUMED") {
    throw new OtpServiceError("TOKEN_ALREADY_CONSUMED", 410);
  }

  if (challenge.status === "EXPIRED") {
    throw new OtpServiceError("EMAIL_VERIFICATION_EXPIRED", 410);
  }

  if (challenge.status === "LOCKED") {
    throw new OtpServiceError("CHALLENGE_LOCKED", 423);
  }

  if (challenge.status !== "VERIFIED" || !challenge.tokenHash) {
    throw new OtpServiceError("EMAIL_VERIFICATION_INVALID", 401);
  }

  const tokenMatches = await bcrypt.compare(token, challenge.tokenHash);
  if (!tokenMatches) {
    throw new OtpServiceError("INVALID_TOKEN", 401);
  }

  await tx.otpChallenge.update({
    where: {
      id: challenge.id,
    },
    data: {
      status: "CONSUMED",
    },
  });
  await writeAuditLog(tx, "CONSUMED", challenge.phone, "unknown", challenge.id);

  return {
    email: challenge.phone,
  };
}
