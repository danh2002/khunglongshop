# Issue #2 Comment: Phone OTP Registration

Source: https://github.com/danh2002/khunglongshop/issues/2#issuecomment-4704896057

## Overview

The issue comment asks to add registration with a phone number and OTP confirmation before the user account is created.

The repository already has:

- Public registration UI at `/register`.
- `POST /api/register` with email/password validation, duplicate email protection, bcrypt hashing, and basic IP rate limiting.
- NextAuth credentials login at `/login` and `/api/auth/[...nextauth]`.
- `User.email`, `User.password`, `User.role`, and `User.isActive` in Prisma.
- Protected account, checkout, order, wishlist, and collection routes that rely on `session.user.id`.
- Shared validation helpers in `utils/validation.ts` and shared app rate limiting in `lib/rateLimit.ts`.

This spec extends the existing auth flow. It does not replace NextAuth or the current account system.

## Scope

- Collect phone number during public registration.
- Send a numeric OTP to the submitted phone number.
- Require successful OTP verification before creating a user.
- Persist normalized, verified phone details on `User`.
- Add server-side throttling, expiry, attempt limits, and safe OTP storage.
- Add a provider abstraction so development can use a fake/logging provider while production can use a real SMS gateway.
- Add tests for validation, rate limits, OTP lifecycle, and user creation.

## Default Decisions

- New OTP request behavior is locked: when a new OTP is requested for the same phone, mark all previous challenges for that phone as `EXPIRED` before creating the new one. Only one `PENDING` challenge may exist per phone at any time.
- Re-verification behavior is locked: if a challenge is `VERIFIED` and the token has not been consumed, the same OTP may be re-verified until token expiry. Each re-verification returns a fresh signed token, replaces the stored token hash, and leaves the challenge `VERIFIED`.
- Token consumption behavior is locked: the phone verification token is consumed only after successful user insertion. If `/api/register` fails because of duplicate email, validation, or database error, the challenge remains `VERIFIED` and reusable until token expiry.
- Rate limits are locked and are not configurable at runtime:
  - Per phone: maximum 3 OTP requests per 15 minutes. The 4th returns `429 { error: "TOO_MANY_OTP_REQUESTS" }`.
  - Per IP: maximum 10 OTP requests per 15 minutes. The 11th returns `429 { error: "IP_RATE_LIMITED" }`.
  - Per challenge: maximum 5 wrong verification attempts. The 5th wrong attempt sets status to `LOCKED` and returns `423 { error: "CHALLENGE_LOCKED" }`.
- Data retention is locked: delete `CONSUMED`, `EXPIRED`, and `LOCKED` challenges older than 7 days. Run cleanup lazily on each new OTP request and daily at 03:00 UTC. Never store raw OTP codes after hashing; store only bcrypt hashes of OTP codes.
- Phone policy is locked to Vietnam mobile numbers for this issue. Accept only `0xxxxxxxxx` or `+84xxxxxxxxx` matching `/^(0|\+84)(3|5|7|8|9)\d{8}$/`. Normalize `+84` to leading `0` before storing and comparing.
- Concurrent same-phone requests are locked by database row-level locking. `/api/otp/request` must use a Prisma transaction with `SELECT ... FOR UPDATE` on a per-phone lock row before expiring old challenges and inserting the new one.
- Challenge creation order is locked: create the `PENDING` challenge in the database first, commit, then send SMS. If SMS fails after commit, immediately mark the new challenge `EXPIRED` and return `503 SMS_PROVIDER_UNAVAILABLE`.
- Runtime expiry enforcement is locked: `/api/otp/verify` and `/api/register` must check challenge/token expiry at request time and mark expired challenges `EXPIRED`; cleanup jobs are secondary.
- Audit retention disposal is locked: the daily 03:00 UTC cleanup deletes `OtpAuditLog` rows older than 90 days and logs deletion counts.
- Concurrent duplicate requests are coalesced during the resend window: if a `PENDING` challenge for the same phone was created less than 60 seconds ago, the request returns `429 { error: "OTP_RESEND_NOT_READY" }` with the existing challenge metadata and does not create a new challenge or send another SMS. This is how two simultaneous requests result in exactly one SMS.
- OTP request rate limits are DB-backed events, not in-memory counters. Hard user quota counts only `SENT` rows. `RESERVED`, `FAILED`, and `FAILED_STALE` rows do not count against user quota.
- `RESERVED` rate-limit rows older than 2 minutes are treated as `FAILED_STALE`; cron Phase 0 marks them stale before all other cleanup phases. Crash recovery can affect quota for at most 2 minutes.
- Provider-failure throttling is separate from user request quota: if an IP has 10 SMS-provider failures in 15 minutes, return `503 { error: "PROVIDER_FAILURE_THROTTLE" }` without attempting another provider call.

## Non-Goals

- Do not add phone-only login in this issue.
- Do not add password reset by phone in this issue.
- Do not add two-factor authentication for existing login in this issue.
- Do not auto-create a user before phone verification succeeds.
- Do not store plaintext OTP values.
- Do not store plaintext passwords in a pending-registration table.
- Do not implement a full SMS vendor dashboard in the admin CMS.
- Do not change checkout phone validation except where shared phone normalization can be reused safely.

## Functional Requirements

- `REG-OTP-001`: The registration form must include a required phone number field.
- `REG-OTP-002`: The phone number must be normalized to a canonical format before persistence and uniqueness checks.
- `REG-OTP-003`: A visitor must be able to request an OTP for a valid phone number.
- `REG-OTP-004`: OTP request must reject a phone number already attached to an existing user.
- `REG-OTP-005`: OTP request must be rate limited by IP and normalized phone number.
- `REG-OTP-006`: OTP values must expire 5 minutes after challenge creation.
- `REG-OTP-007`: OTP verification must allow at most 5 incorrect attempts per challenge.
- `REG-OTP-008`: Successful OTP verification must return a short-lived one-time verification token.
- `REG-OTP-009`: `POST /api/register` must require email, password, phone, and phone verification token.
- `REG-OTP-010`: Registration must consume the verified phone challenge exactly once.
- `REG-OTP-011`: User creation must persist `phone` and `phoneVerifiedAt`.
- `REG-OTP-012`: Duplicate email and duplicate phone races must be handled with unique constraints and safe error responses.
- `REG-OTP-013`: API responses must never expose OTP hashes, raw OTPs, password hashes, or provider secrets.
- `REG-OTP-014`: Development and test environments must be able to run without a paid SMS provider.
- `REG-OTP-015`: Registration UI must clearly handle request, resend, verify, expired, locked, loading, and success states.

## Acceptance Criteria

- A valid new user can enter email, password, confirm password, phone, receive an OTP, verify it, and create an account.
- A user cannot create an account without a verified phone challenge.
- A verification token for phone A cannot be used to register phone B.
- A verification token cannot be reused after successful registration.
- An expired OTP cannot be verified.
- Too many wrong OTP attempts locks the challenge and requires a new OTP request after rate-limit rules allow it.
- Existing email registration behavior remains intact except for the new phone verification requirement.
- Existing login still uses email/password and refuses inactive users.
- The created user has `phone` set to the normalized value and `phoneVerifiedAt` set.
- API tests cover unauthenticated public registration flows without relying on a real SMS network call.
- Authenticated user visits `/register`: server checks session before rendering, returns `308` redirect to `/account`, and `GET /register` with a valid session cookie is tested.

Complete acceptance criteria:

Happy path:

- [ ] Valid phone returns `200`, SMS is sent, and a `PENDING` challenge is created.
- [ ] Correct OTP returns `200`, marks challenge `VERIFIED`, and returns a fresh verification token.
- [ ] Valid token plus unique email and unique phone returns `201`, creates user, and marks challenge `CONSUMED`.
- [ ] Authenticated user `GET /register` returns `308` redirect to `/account`.

Resend window:

- [ ] Request within 60 seconds of existing `PENDING` challenge returns `429 { error: "OTP_RESEND_NOT_READY", retryAfterSeconds: N }`; no new challenge is created and no SMS is sent.
- [ ] Request after 60 seconds of existing `PENDING` challenge marks old challenge `EXPIRED`, creates new `PENDING` challenge, and sends new SMS.

Concurrency:

- [ ] Two simultaneous requests for the same phone in the same resend window result in one `200`, one `429 OTP_RESEND_NOT_READY`, exactly one SMS, and one `PENDING` challenge.

Rate limits:

- [ ] 4th `SENT` request for a phone in 15 minutes returns `429 TOO_MANY_OTP_REQUESTS`.
- [ ] 11th `SENT` request for an IP in 15 minutes returns `429 IP_RATE_LIMITED`.
- [ ] Failed SMS marks rate-limit event `FAILED` and is not counted toward `SENT` quota.
- [ ] `RESERVED` row older than 2 minutes is treated as `FAILED_STALE` and is not counted toward quota.

Provider failure:

- [ ] SMS timeout marks challenge `EXPIRED` and returns `503 SMS_PROVIDER_UNAVAILABLE`.
- [ ] 10 `FAILED` provider calls from the same IP in 15 minutes return `503 PROVIDER_FAILURE_THROTTLE`.
- [ ] Failed SMS does not consume user rate limit; `SENT` count is unchanged.

Verify errors:

- [ ] Wrong OTP before the 5th attempt returns `422 INVALID_OTP` and increments attempts.
- [ ] Wrong OTP on the 5th attempt returns `423 CHALLENGE_LOCKED`.
- [ ] `LOCKED` challenge returns `423 CHALLENGE_LOCKED`.
- [ ] `PENDING` challenge past `expiresAt` returns `410 CHALLENGE_EXPIRED`.
- [ ] `VERIFIED` challenge past `tokenExpiry` returns `410 PHONE_VERIFICATION_EXPIRED`.
- [ ] `CONSUMED` challenge returns `410 TOKEN_ALREADY_CONSUMED`.
- [ ] Network retry on `VERIFIED` challenge returns `200` with a fresh token.

Register errors:

- [ ] Duplicate email returns `409 EMAIL_ALREADY_EXISTS` and token stays `VERIFIED`.
- [ ] Duplicate phone race returns `409 PHONE_ALREADY_REGISTERED` and token stays `VERIFIED`.
- [ ] `CONSUMED` token returns `410 TOKEN_ALREADY_CONSUMED`.
- [ ] Expired token returns `410 PHONE_VERIFICATION_EXPIRED`.

Cleanup:

- [ ] Cron Phase 0 marks `RESERVED` rows older than 2 minutes as `FAILED_STALE`.
- [ ] Cron Phase 1 marks `PENDING` past `expiresAt` as `EXPIRED`.
- [ ] Cron Phase 1 marks `VERIFIED` past `tokenExpiry` as `EXPIRED`.
- [ ] Cron Phase 2 deletes terminal challenges older than 7 days.
- [ ] Cron Phase 3 deletes `OtpAuditLog` older than 90 days.
- [ ] Cron Phase 4 deletes `OtpRateLimitEvent` older than 7 days.
- [ ] `OtpAuditLog` never stores a full phone number; it stores masked format only, for example `091****678`.

## UX Flow

1. Visitor opens `/register`.
2. Visitor enters name, last name, email, password, confirm password, and phone number.
3. Visitor chooses `Send OTP`.
4. UI calls `POST /api/otp/request` with phone.
5. API validates and normalizes phone, checks uniqueness, creates an OTP challenge, and sends the code.
6. UI shows OTP input, resend countdown, and masked destination phone.
7. Visitor enters OTP.
8. UI calls `POST /api/otp/verify`.
9. API verifies OTP and returns `phoneVerificationToken`.
10. UI submits `POST /api/register` with email, password, phone, and `phoneVerificationToken`.
11. API creates the user and consumes the verification token.
12. UI redirects to `/login` or signs in automatically if that product decision is made during implementation.

Locked decision: keep the current redirect to `/login` after registration so this issue stays narrow.

## Architecture Decisions

### Decision 1: Verify Phone Before Creating User

Create the user only after phone verification succeeds.

Rationale:

- Avoids inactive or half-created users from abandoned OTP attempts.
- Keeps existing NextAuth login behavior simple.
- Avoids storing plaintext or reversibly encrypted passwords before OTP confirmation.

Alternative considered:

- Create an inactive user first, then activate after OTP. This complicates duplicate handling, abandoned accounts, and login edge cases.

### Decision 2: Verification Token Instead of Pending Password Storage

OTP verification returns a short-lived one-time token. `POST /api/register` consumes that token together with the final registration payload.

Rationale:

- Password is only submitted to the final registration endpoint.
- Token binding to phone prevents using one verified phone for another number.
- The current `/api/register` route remains the account creation boundary.

### Decision 3: Database-Backed OTP Challenges

Store OTP challenges in MySQL through Prisma, not only in memory.

Rationale:

- Works across server restarts better than an in-memory store.
- Enables cleanup, audit, attempt tracking, and concurrency-safe consumption.
- The repo already uses Prisma/MySQL for business state.

### Decision 4: SMS Provider Interface

Add a small `lib/sms` provider interface with environment-selected implementations.

Rationale:

- No SMS SDK is currently installed.
- Tests can inject a fake provider.
- Production can later use Twilio, Vonage, AWS SNS, or a Vietnam SMS provider without changing route contracts.

## OTP Challenge Lifecycle Rules

- At most one `PENDING` challenge per phone may exist at any time.
- Requesting a new OTP after `resendAfterSeconds` marks all existing `PENDING` challenges for that phone as `EXPIRED`, then creates a new `PENDING` challenge.
- Requesting a new OTP within `resendAfterSeconds` returns `OTP_RESEND_NOT_READY` and leaves the existing `PENDING` challenge active.
- `resendCount` on the new challenge starts at `0`; previous challenge history is retained for audit but made inactive.
- Client receives `{ challengeId, expiresAt, resendAfterSeconds: 60 }`.
- Previous OTP codes are invalidated immediately upon new challenge creation.
- The concurrency invariant is enforced with a database transaction and row-level lock on `OtpPhoneLock`. Application code must not rely on in-memory locks.
- MySQL does not support a filtered unique index in the same way as PostgreSQL. Enforce "one pending per phone" with the `SELECT ... FOR UPDATE` transaction, plus application-level post-transaction assertions in tests.

State transition table:

| From | Event | To | Who sets |
| --- | --- | --- | --- |
| `PENDING` | Correct OTP entered | `VERIFIED` | verify API |
| `PENDING` | 5 wrong attempts | `LOCKED` | verify API |
| `PENDING` | OTP expiry time passed | `EXPIRED` | cleanup job |
| `PENDING` | New OTP requested same phone after 60-second resend window | `EXPIRED` | request API |
| `VERIFIED` | Successful user creation | `CONSUMED` | register API |
| `VERIFIED` | Token expiry passed | `EXPIRED` | cleanup job |
| `VERIFIED` | Re-verify same OTP | `VERIFIED` | verify API |
| `LOCKED` | terminal | - | - |
| `CONSUMED` | terminal | - | - |
| `EXPIRED` | terminal | - | - |

Serialization guarantee for `/api/otp/request`:

- Implementation must use a database transaction with row-level locking.
- Because `SELECT ... FOR UPDATE` cannot lock a missing row, create or reuse an `OtpPhoneLock` row for each normalized phone before locking.
- Add a cheap application-level pre-check before acquiring the lock, but enforce the hard limit with DB-backed reservations inside the transaction.
- Pseudocode:

```ts
const result = await prisma.$transaction(async (tx) => {
  await tx.otpPhoneLock.upsert({
    where: { phone },
    create: { phone },
    update: {},
  });

  await tx.$queryRaw`
    SELECT phone FROM OtpPhoneLock
    WHERE phone = ${phone}
    FOR UPDATE
  `;

  const existingFresh = await tx.otpChallenge.findFirst({
    where: {
      phone,
      status: "PENDING",
      createdAt: { gt: new Date(Date.now() - 60_000) },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, expiresAt: true },
  });

  if (existingFresh) {
    return {
      kind: "resend-not-ready",
      challengeId: existingFresh.id,
      expiresAt: existingFresh.expiresAt,
      retryAfterSeconds: 60,
    };
  }

  await tx.otpRateLimitEvent.updateMany({
    where: {
      status: "RESERVED",
      createdAt: { lt: new Date(Date.now() - 2 * 60_000) },
    },
    data: { status: "FAILED_STALE" },
  });

  const [phoneCount, ipCount, providerFailureCount] = await Promise.all([
    tx.otpRateLimitEvent.count({
      where: {
        scope: "PHONE",
        key: phone,
        status: "SENT",
        createdAt: { gt: new Date(Date.now() - 15 * 60_000) },
      },
    }),
    tx.otpRateLimitEvent.count({
      where: {
        scope: "IP",
        key: ip,
        status: "SENT",
        createdAt: { gt: new Date(Date.now() - 15 * 60_000) },
      },
    }),
    tx.otpRateLimitEvent.count({
      where: {
        scope: "IP",
        key: ip,
        status: "FAILED",
        createdAt: { gt: new Date(Date.now() - 15 * 60_000) },
      },
    }),
  ]);

  if (phoneCount >= 3) return { kind: "too-many-phone" };
  if (ipCount >= 10) return { kind: "too-many-ip" };
  if (providerFailureCount >= 10) return { kind: "provider-failure-throttle" };

  const reservation = await tx.otpRateLimitEvent.create({
    data: { scope: "PHONE", key: phone, ip, status: "RESERVED" },
  });
  await tx.otpRateLimitEvent.create({
    data: { scope: "IP", key: ip, phone, status: "RESERVED", pairedEventId: reservation.id },
  });

  await tx.otpChallenge.updateMany({
    where: { phone, status: "PENDING" },
    data: { status: "EXPIRED" },
  });

  const challenge = await tx.otpChallenge.create({
    data: { phone, otpHash, status: "PENDING", expiresAt, resendCount: 0 },
  });

  return { kind: "created", challenge, reservationId: reservation.id };
});

if (result.kind === "resend-not-ready") {
  return Response.json({
    error: "OTP_RESEND_NOT_READY",
    challengeId: result.challengeId,
    expiresAt: result.expiresAt,
    retryAfterSeconds: result.retryAfterSeconds,
  }, { status: 429 });
}

if (result.kind === "too-many-phone") {
  return Response.json({ error: "TOO_MANY_OTP_REQUESTS" }, { status: 429 });
}

if (result.kind === "too-many-ip") {
  return Response.json({ error: "IP_RATE_LIMITED" }, { status: 429 });
}

if (result.kind === "provider-failure-throttle") {
  return Response.json({ error: "PROVIDER_FAILURE_THROTTLE" }, { status: 503 });
}

const latest = await prisma.otpChallenge.findFirst({
  where: { phone, status: "PENDING" },
  orderBy: { createdAt: "desc" },
  select: { id: true },
});

if (latest?.id !== result.challenge.id) {
  return Response.json({ error: "OTP_SUPERSEDED" }, { status: 409 });
}

await sendSms(phone, rawOtp);
```

- If two concurrent requests arrive, the first creates the pending challenge and the second returns `OTP_RESEND_NOT_READY` while the first challenge is still fresh.
- Net result after both requests complete: exactly one `PENDING` challenge for the phone.
- Before sending SMS, the request must re-read its challenge and confirm it is still the latest `PENDING` challenge for that phone. If it has been superseded, do not send the superseded OTP and do not count the request.
- After successful SMS, update the paired rate-limit events from `RESERVED` to `SENT`.
- After failed SMS, update the paired rate-limit events from `RESERVED` to `FAILED`.
- If the process crashes before marking `RESERVED` events as `SENT` or `FAILED`, cron Phase 0 marks those rows `FAILED_STALE` after 2 minutes and they no longer affect quota.
- Tests must prove the invariant under two simultaneous requests for the same phone.

SMS send failure compensation:

- The challenge is created and committed before SMS is sent.
- Success path: return `200 { challengeId, expiresAt, resendAfterSeconds: 60 }`.
- Failure path for provider timeout, `success: false`, or retry exhaustion:
  - Update `OtpChallenge` status to `EXPIRED` where `id = challengeId`.
  - Return `503 { error: "SMS_PROVIDER_UNAVAILABLE" }`.
  - Do not increment the request rate-limit counter because failure is not the user's fault.
  - Log `{ phone: masked, challengeId, providerError, timestamp }`.
- This means a challenge can briefly exist as `PENDING` and then become `EXPIRED`; the client receives a clean failure and cannot verify the code.

## Data Model

Current datasource is `mysql` in `prisma/schema.prisma`.

Recommended Prisma additions. Do not replace the existing `User` model; add these fields to the current model and preserve all existing relations.

```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  phone           String?   @unique
  phoneVerifiedAt DateTime?
  password        String?
  role            Role      @default(user)
  isActive        Boolean   @default(true)
  deactivatedAt   DateTime?
}

model OtpChallenge {
  id          String             @id @default(cuid())
  phone       String             // normalized 0xxxxxxxxx format
  otpHash     String             // bcrypt hash of 6-digit code
  status      OtpChallengeStatus @default(PENDING)
  attempts    Int                @default(0)
  resendCount Int                @default(0)
  tokenHash   String?            // bcrypt hash of verification token
  tokenExpiry DateTime?          // 15 min from verification
  expiresAt   DateTime           // 5 min from creation
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  @@index([phone, status])
  @@index([status, updatedAt]) // for cleanup queries
}

model OtpPhoneLock {
  phone     String   @id // normalized 0xxxxxxxxx format
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model OtpRateLimitEvent {
  id            String             @id @default(cuid())
  scope         OtpRateLimitScope
  key           String             // normalized phone or IP address
  phone         String?
  ip            String?
  status        OtpRateLimitStatus @default(RESERVED)
  pairedEventId String?            // reference only; no FK required
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  @@index([scope, key, status, createdAt])
  @@index([pairedEventId])
}

model OtpAuditLog {
  id          String   @id @default(cuid())
  phoneMasked String   // e.g. "091****678"; never store full phone
  event       String   // REQUEST | VERIFY_OK | VERIFY_FAIL | CONSUMED | EXPIRED | LOCKED
  ip          String
  challengeId String   // reference only; no FK because challenge may be deleted
  createdAt   DateTime @default(now())

  @@index([createdAt])
  @@index([challengeId])
}

enum OtpChallengeStatus {
  PENDING
  VERIFIED
  CONSUMED
  EXPIRED
  LOCKED
}

enum OtpRateLimitScope {
  PHONE
  IP
}

enum OtpRateLimitStatus {
  RESERVED
  SENT
  FAILED
  FAILED_STALE
}
```

Migration notes:

- Add `User.phone` as nullable first.
- Backfill is not required for existing users in this issue.
- If existing users must later add phone numbers, create a separate profile phone-verification flow.
- Keep `phone` nullable until legacy users have a migration path.
- Store OTP challenges in `OtpChallenge`.
- Store per-phone lock rows in `OtpPhoneLock` so same-phone request serialization works even when no challenge exists yet.
- Store OTP request accounting in `OtpRateLimitEvent` so hard phone/IP limits remain correct under concurrent requests.
- `resendCount` is stored but not actively used in business logic. It is reserved for a future "You have requested N codes for this session" feature. Implementers should store it but do not enforce any limit based on it. Incrementing it on each new challenge for the same phone session is optional.
- Store only audit-safe metadata in `OtpAuditLog`; do not store OTP hashes, token hashes, raw tokens, raw OTPs, or full phone numbers in audit logs.

## Phone Normalization

Add a shared helper, for example `lib/phone.ts`:

```ts
type NormalizedPhone = {
  e164: string;
  national: string;
  countryCode: string;
  masked: string;
};
```

Rules:

- Strip spaces, dashes, parentheses, and dots.
- Accept only Vietnam mobile formats matching `/^(0|\+84)(3|5|7|8|9)\d{8}$/`.
- Normalize `+84xxxxxxxxx` to `0xxxxxxxxx`.
- Store and compare only the normalized `0xxxxxxxxx` value in `User.phone` and `OtpChallenge.phone`.
- Reject any other country code, non-numeric value, or value with fewer than 10 digits.
- Return masked phone values to the browser, for example `091****678`.

Phone validation examples:

```text
Valid:   0912345678, 0387654321, +84912345678, +84387654321
Invalid: +1234567890 (US), +447911123456 (UK), 091234567 (9 digits),
         0112345678 (landline prefix 01x not mobile), abc1234567
Normalization: +84912345678 -> 0912345678 (stored and compared as 0xxx format)
Duplicate check uses normalized format.
```

## API Contracts

### `POST /api/otp/request`

Purpose: create or replace a registration OTP challenge and send an SMS.

Request:

```ts
type RequestOtpBody = {
  phone: string;
};
```

Success response:

```ts
type RequestOtpResponse = {
  challengeId: string;
  phoneMasked: string;
  expiresAt: string;
  resendAfterSeconds: 60;
};
```

Error codes:

- `INVALID_PHONE`
- `INVALID_PHONE_FORMAT`
- `PHONE_ALREADY_REGISTERED`
- `OTP_RESEND_NOT_READY`
- `TOO_MANY_OTP_REQUESTS`
- `IP_RATE_LIMITED`
- `SMS_PROVIDER_UNAVAILABLE`
- `PROVIDER_FAILURE_THROTTLE`
- `INVALID_REQUEST`

Rules:

- Validate request size and JSON shape.
- Normalize phone before any lookup.
- Check no `User` already has that normalized phone.
- Enforce hard request limits with the check/execute/send/commit pattern:
  - Lock the normalized phone row through `OtpPhoneLock`.
  - If an existing `PENDING` challenge is younger than 60 seconds, return `429 { error: "OTP_RESEND_NOT_READY" }` with existing challenge metadata.
  - Mark `RESERVED` rows older than 2 minutes as `FAILED_STALE`.
  - Check `SENT` request event count for phone in the last 15 minutes. If `>= 3`, return `429 { error: "TOO_MANY_OTP_REQUESTS" }`.
  - Check `SENT` request event count for IP in the last 15 minutes. If `>= 10`, return `429 { error: "IP_RATE_LIMITED" }`.
  - Check `FAILED` provider event count for IP in the last 15 minutes. If `>= 10`, return `503 { error: "PROVIDER_FAILURE_THROTTLE" }` before calling the provider again.
  - Create `RESERVED` phone/IP rate-limit events in the transaction.
  - Run the transaction that expires old challenges and creates the new challenge.
  - Attempt SMS send.
  - Mark reserved rate-limit events `SENT` only after SMS is sent successfully.
  - On SMS failure, expire the challenge and mark reserved events `FAILED`; `FAILED` events do not count toward the user's phone/IP request quota.
- Generate a 6-digit numeric OTP with `crypto.randomInt`.
- Store only a bcrypt hash of the OTP.
- Send SMS through `sendSms({ to, body })`.
- If the SMS provider succeeds, keep the new challenge `PENDING` and return the challenge response.
- If the SMS provider fails after the challenge is created, update the challenge to `EXPIRED`, return `503 { error: "SMS_PROVIDER_UNAVAILABLE" }`, and do not consume request rate-limit quota.
- Provider failure events are still retained for provider-failure throttling and abuse detection.
- In development/test, fake provider may expose OTP only in server logs or captured test sink, never in browser response.

### `POST /api/otp/verify`

Purpose: verify an OTP and return a one-time token for final registration.

Request:

```ts
type VerifyOtpBody = {
  challengeId: string;
  phone: string;
  otp: string;
};
```

Success response:

```ts
type VerifyOtpResponse = {
  phoneVerificationToken: string;
  phoneMasked: string;
  verifiedAt: string;
  tokenExpiresAt: string;
};
```

Error codes:

- `OTP_NOT_FOUND`
- `CHALLENGE_EXPIRED`
- `CHALLENGE_LOCKED`
- `PHONE_VERIFICATION_EXPIRED`
- `TOKEN_ALREADY_CONSUMED`
- `INVALID_OTP`
- `INVALID_REQUEST`

Rules:

- Expiry check must run before any other logic:

```ts
if (challenge.expiresAt < new Date() && challenge.status === "PENDING") {
  await markExpired(challenge.id);
  return Response.json({ error: "CHALLENGE_EXPIRED" }, { status: 410 });
}

if (challenge.status === "VERIFIED" && challenge.tokenExpiry && challenge.tokenExpiry < new Date()) {
  await markExpired(challenge.id);
  return Response.json({ error: "PHONE_VERIFICATION_EXPIRED" }, { status: 410 });
}
```

- Challenge must match normalized phone.
- If `challenge.status === PENDING`, verify the submitted OTP.
- If `challenge.status === VERIFIED` and token is not consumed, allow idempotent re-verification of the same OTP until `tokenExpiry`.
- If `challenge.status === CONSUMED`, return `410 { error: "TOKEN_ALREADY_CONSUMED" }`.
- If `challenge.status === LOCKED`, return `423 { error: "CHALLENGE_LOCKED" }`.
- If `challenge.status === EXPIRED`, return `410 { error: "CHALLENGE_EXPIRED" }`.
- Expired challenges must not verify.
- Wrong attempts before the 5th return `422 { error: "INVALID_OTP" }` and increment `attempts`.
- At max attempts, set `status = LOCKED`.
- Successful first verification sets `status = VERIFIED`, generates a signed token, stores its bcrypt `tokenHash`, and sets `tokenExpiry` to 15 minutes from verification.
- Idempotent re-verification generates a fresh signed token, replaces `tokenHash`, returns `200`, and keeps the challenge `VERIFIED`.
- Raw verification token is included only in the HTTP response body; it is never persisted. The server stores only `bcrypt(token)`.
- Re-verification generates a new raw token, re-hashes it, returns the new raw token, and invalidates the previous raw token.
- Client must store the most recently received token for use in `/api/register`.

### `POST /api/register`

Current route exists. Extend its body.

Request:

```ts
type RegisterBody = {
  email: string;
  password: string;
  phone: string;
  phoneVerificationToken: string;
};
```

Success response:

```ts
type RegisterResponse = {
  message: "User registered successfully";
  userId: string;
};
```

New error codes:

- `PHONE_VERIFICATION_REQUIRED`
- `PHONE_ALREADY_REGISTERED`
- `PHONE_VERIFICATION_EXPIRED`
- `PHONE_VERIFICATION_INVALID`
- `EMAIL_ALREADY_EXISTS`
- `TOKEN_ALREADY_CONSUMED`

Error table:

| Status | Code | Cause |
| --- | --- | --- |
| 409 | `EMAIL_ALREADY_EXISTS` | Email is already registered |
| 409 | `PHONE_ALREADY_REGISTERED` | Phone was claimed by another account between OTP verification and registration |
| 410 | `TOKEN_ALREADY_CONSUMED` | Verification token was already used |
| 410 | `PHONE_VERIFICATION_EXPIRED` | Verification token expired |

Rules:

- Keep existing email/password validation and bcrypt cost.
- Normalize phone and verify token inside the same transaction that creates the user.
- Runtime token expiry check must run before token comparison:

```ts
if (challenge.tokenExpiry && challenge.tokenExpiry < new Date()) {
  await markExpired(challenge.id);
  return Response.json({ error: "PHONE_VERIFICATION_EXPIRED" }, { status: 410 });
}
```

- Require a matching `OtpChallenge` with status `VERIFIED`, same phone, unexpired `tokenExpiry`, and matching `tokenHash`.
- Create `User` with email, password hash, role `user`, phone, and `phoneVerifiedAt`.
- Set challenge status to `CONSUMED`.
- Handle Prisma unique conflicts for email and phone.
- If registration fails because of duplicate email (`P2002` on the email field), return `409 { error: "EMAIL_ALREADY_EXISTS" }`.
- On duplicate email, the phone token remains `VERIFIED`; the user can retry with a different email without repeating SMS verification while the token remains unexpired.
- UI must show `Email này đã được sử dụng. Vui lòng dùng email khác hoặc đăng nhập.` with a link to `/login`.
- If registration fails because of duplicate phone (`P2002` on the phone field), return `409 { error: "PHONE_ALREADY_REGISTERED", loginUrl: "/login" }`.
- On duplicate phone, the phone token remains `VERIFIED`; it is not consumed and there is no retry penalty.
- UI must show `Số điện thoại đã được đăng ký. Đăng nhập tại đây.` with a link to `/login`.
- If the user does not own the account that already has the phone, UI should direct them to contact support.
- Token consumption happens atomically inside the successful user creation transaction.

### `GET /register`

Rules:

- Server checks session before rendering.
- If a valid session exists, return `308` redirect to `/account`.
- This behavior must be covered by a route/page test with a valid session cookie.

## SMS Provider Integration

- Request timeout: 10 seconds.
- Retry policy: 1 automatic retry after 3 seconds on timeout or 5xx response.
- No retry on 4xx responses, including bad phone number and rejected message.
- Expected provider response shape:

```ts
type SmsProviderResponse = {
  success: boolean;
  messageId?: string;
  error?: string;
};
```

- If provider returns `success: false` or times out after retry, return `503 { error: "SMS_PROVIDER_UNAVAILABLE" }`.
- On provider failure after challenge creation, mark the challenge `EXPIRED`.
- On provider failure, do not consume request rate-limit quota.
- UI shows `Không thể gửi SMS lúc này. Vui lòng thử lại sau.`
- Log provider name, masked phone, message ID, latency, and error.
- Required environment variables:
  - `SMS_PROVIDER_URL`
  - `SMS_API_KEY`
  - `SMS_FROM_NUMBER`
  - `SMS_TIMEOUT_MS=10000`

## Frontend Changes

### `/register`

Update the existing client page:

- Add phone input with `autocomplete="tel"`.
- Add `Send OTP` action beside or below phone input.
- Add OTP input after a challenge is created.
- Add resend countdown based on `resendAfterSeconds`.
- Disable final registration until OTP is verified.
- Keep existing email/password/confirm-password validation.
- Submit named fields through `FormData`, preserving the current non-indexed pattern.
- Show field-level or toast errors for invalid phone, rate limit, expired OTP, wrong OTP, and duplicate phone.
- Keep the dark/orange auth card style already used by login/register.
- Use compact operational UI, not a marketing hero.

Recommended component state:

```ts
type OtpState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent"; challengeId: string; phoneMasked: string; expiresAt: string }
  | { status: "verifying"; challengeId: string; phoneMasked: string }
  | { status: "verified"; phoneVerificationToken: string; phoneMasked: string }
  | { status: "expired" }
  | { status: "locked" };
```

Coalesced request client behavior:

- Server returns `429 OTP_RESEND_NOT_READY { retryAfterSeconds: N }`.
- Client renders the OTP input form for the existing challenge and a countdown timer.
- When the countdown reaches `0`, the `Gửi lại mã` button becomes active.
- User clicks resend: client sends a new request. If the resend window elapsed, the server creates a new challenge and sends a new SMS. If still inside the window because of timing drift, another `OTP_RESEND_NOT_READY` response resets the countdown.
- Client does not poll the server for SMS delivery status.
- If OTP never arrives, user waits for the countdown and requests a new code.
- Server does not guarantee delivery notification to coalesced callers.
- If the original SMS fails, the server marks the challenge `EXPIRED` immediately. Any subsequent request after the resend window creates a fresh challenge and SMS.

## Backend Changes

Suggested files:

```text
app/api/otp/request/route.ts
app/api/otp/verify/route.ts
app/api/register/route.ts
lib/phone.ts
lib/otp.ts
lib/sms/index.ts
lib/sms/fakeProvider.ts
lib/sms/httpProvider.ts
utils/schema.ts
prisma/schema.prisma
tests/unit/phone.test.ts
tests/unit/otp.test.ts
tests/unit/registerOtpApi.test.ts
```

`lib/otp.ts` should own:

- OTP generation.
- OTP hashing and verification.
- Verification-token generation and hashing.
- Expiry checks.
- Status transitions.

`lib/sms/index.ts` should own:

```ts
type SmsMessage = {
  to: string;
  body: string;
};

type SmsProvider = {
  send(message: SmsMessage): Promise<void>;
};
```

Environment variables:

- `SMS_PROVIDER_URL`: required for production SMS provider.
- `SMS_API_KEY`: required for generic HTTP provider.
- `SMS_FROM_NUMBER`: required sender name/number.
- `SMS_TIMEOUT_MS=10000`.

## Security Requirements

- Use `crypto.randomInt(0, 1_000_000)` for 6-digit OTP generation.
- Store bcrypt OTP hash, not raw OTP.
- Never include OTP in JSON responses.
- Do not log OTP in production.
- Rate limit request endpoints by IP and phone using the locked hard limits.
- Do not reveal whether an email exists from OTP endpoints.
- It is acceptable to return `PHONE_ALREADY_REGISTERED` from OTP request because the user controls the submitted phone and needs actionable registration feedback.
- Use DB transactions for token consumption and user creation.
- Treat phone verification tokens as bearer secrets; sign the raw token, hash it at rest with bcrypt, and set a locked 15-minute expiry.

## OTP Challenge Retention

- Cleanup trigger: run on every new OTP request as lazy cleanup.
- Also run daily cron at 03:00 UTC.
- Cron Phase 0 runs first and marks stale reservations:
  - `RESERVED` rows where `createdAt < NOW() - INTERVAL 2 MINUTE` become `FAILED_STALE`.
- Cron Phase 1 marks active expired challenges:
  - `PENDING` where `expiresAt < NOW()` becomes `EXPIRED`.
  - `VERIFIED` where `tokenExpiry < NOW()` becomes `EXPIRED`.
- Cron Phase 2 deletes challenges where `status IN ('CONSUMED','EXPIRED','LOCKED')` and `updatedAt < NOW() - INTERVAL 7 DAY`.
- Never delete `PENDING` or `VERIFIED` challenges because they may still be active.
- Retain challenge metadata for 90 days in `OtpAuditLog`.
- Cron Phase 3 deletes audit rows where `createdAt < NOW() - INTERVAL 90 DAY`.
- Cron Phase 4 deletes rate-limit rows where `createdAt < NOW() - INTERVAL 7 DAY`.
- The same scheduled task handles `OtpRateLimitEvent`, `OtpChallenge`, and `OtpAuditLog` cleanup.
- Cron logs `{ staleReservations: N, expiredChallenges: N, deletedChallenges: N, deletedAuditRows: N, deletedRateLimitRows: N, ranAt: timestamp }`.
- Audit log stores masked phone, event, IP, challenge ID, and timestamps.
- Audit log must not store raw OTP, OTP hash, raw token, token hash, or full phone number.

## Implementation Plan

### Phase 1: Data and Core Helpers

1. Add `User.phone`, `User.phoneVerifiedAt`, `OtpChallengeStatus`, `OtpChallenge`, `OtpPhoneLock`, `OtpRateLimitEvent`, and `OtpAuditLog`.
2. Generate Prisma migration and Prisma client.
3. Add phone normalization/masking helper.
4. Add OTP helper for generation, hashing, verification, and token hashing.
5. Add SMS provider interface with fake/test implementation.

### Phase 2: OTP APIs

1. Add `POST /api/otp/request`.
2. Add `POST /api/otp/verify`.
3. Add bounded rate limits and expiry handling.
4. Add cleanup behavior for stale challenges, either opportunistic in the request route or via a maintenance script.

### Phase 3: Registration Integration

1. Extend `registrationSchema` with phone and phone verification token.
2. Update `POST /api/register` to consume a verified challenge in a transaction.
3. Add unique-conflict handling for `User.phone`.
4. Keep the success response shape compatible with current UI.

### Phase 4: UI

1. Add phone and OTP controls to `/register`.
2. Add request, resend, verify, expired, locked, and success states.
3. Gate final submit on verified OTP.
4. Preserve current redirect to `/login` on successful registration.

### Phase 5: Tests and Verification

1. Add helper unit tests.
2. Add route-handler tests for request, verify, and register consumption.
3. Add regression tests for existing email/password validation.
4. Run `npm run db:generate`, `npm run type-check`, and `npm run test:unit`.

## Test Strategy

### Unit Tests

- Phone normalizer accepts Vietnam local numbers and `+84` numbers.
- Phone normalizer rejects too-short, too-long, and non-phone values.
- Phone masker does not expose full phone numbers.
- OTP generator returns zero-padded 6-digit values.
- OTP hash verification accepts correct OTP and rejects wrong OTP.
- Verification-token hash accepts correct token and rejects wrong token.
- Rate limiter isolates phone and IP keys.

### API Tests

- OTP request rejects invalid phone.
- OTP request rejects phone already attached to a user.
- OTP request creates a challenge with hashed OTP and expiry.
- OTP request calls fake SMS provider in tests.
- OTP request invalidates previous pending challenges for the same phone.
- OTP request serializes two simultaneous requests for the same phone with `OtpPhoneLock`.
- OTP request leaves exactly one pending challenge after concurrent same-phone requests complete.
- OTP request returns `OTP_RESEND_NOT_READY` for same-phone requests inside the 60-second resend window.
- OTP request does not send SMS for a superseded challenge.
- OTP request enforces the hard phone and IP request limits.
- OTP request counts only `SENT` rate-limit events for user quota.
- OTP request marks stale `RESERVED` rows older than 2 minutes as `FAILED_STALE`.
- OTP request returns `503 SMS_PROVIDER_UNAVAILABLE` and marks the created challenge `EXPIRED` when the SMS provider times out after retry.
- OTP request does not increment request counters when SMS sending fails.
- OTP request throttles repeated provider failures by IP before calling the SMS provider again.
- OTP verify rejects wrong challenge ID.
- OTP verify rejects wrong phone for a valid challenge.
- OTP verify marks and rejects expired pending challenges at runtime.
- OTP verify increments attempts on wrong OTP.
- OTP verify locks after max attempts.
- OTP verify returns a token once for a correct OTP.
- OTP verify supports idempotent re-verification of a verified, unconsumed challenge and returns a fresh token.
- Register rejects missing phone verification token.
- Register rejects token for a different phone.
- Register rejects expired or consumed token.
- Register creates user with normalized phone and `phoneVerifiedAt`.
- Register consumes the challenge.
- Register handles duplicate email and duplicate phone conflicts.
- Register leaves the challenge `VERIFIED` when duplicate email prevents user creation.
- Register leaves the challenge `VERIFIED` when duplicate phone prevents user creation.
- Register marks and rejects verified challenges whose `tokenExpiry` has passed at runtime.
- Cleanup deletes terminal challenges older than 7 days and does not delete active `PENDING` or `VERIFIED` challenges.
- Cleanup marks expired active `PENDING` and `VERIFIED` challenges as `EXPIRED` before deletion.
- Cleanup deletes audit rows older than 90 days and logs deletion counts.
- Cleanup marks stale `RESERVED` rate-limit events as `FAILED_STALE`.
- Cleanup deletes rate-limit events older than 7 days.

### UI Tests

- Register page renders phone input and send OTP control.
- Final submit is disabled until OTP verification succeeds.
- Wrong OTP shows an error state without clearing email/password fields.
- Expired OTP prompts the user to request a new code.
- Successful registration redirects to `/login`.
- Long phone/error text does not break mobile layout.

## Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| SMS provider delivery fails or is slow | Medium | High | Provider abstraction, user-facing retry, clear `SMS_PROVIDER_UNAVAILABLE` state |
| OTP brute force | Medium | High | Short TTL, max attempts, phone/IP rate limits, bcrypt-hashed OTP values |
| Duplicate phone race during registration | Medium | Medium | Unique `User.phone` plus transaction and Prisma conflict handling |
| Legacy users do not have phone numbers | High | Medium | Keep `User.phone` nullable and create a later profile verification flow |
| Development blocked by missing SMS account | High | Medium | Fake provider for dev/test |
| Phone normalization rejects valid international users | Medium | Medium | Locked scope is Vietnam mobile only; add a separate future international-phone feature if needed |
| Current in-memory rate limiter is not shared across replicas | Medium | Medium | Accept for current app shape; move OTP rate limits to Redis before multi-replica production |

## Final Decisions

- Use Vietnam-first phone normalization for launch.
- Keep `User.phone` nullable but unique.
- Keep public registration phone verification mandatory.
- Keep admin-created users exempt from OTP for this issue.
- Use fake SMS in development/test and fail closed in production if SMS env vars are missing.
- Redirect to `/login` after registration, matching current behavior.
- There are no remaining open questions blocking implementation.
