# Plan 006: Replace registration SMS OTP with Resend email OTP

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
>
> ```bash
> git diff --stat 8d07eea..HEAD -- package.json package-lock.json app/api/otp/request/route.ts app/api/otp/verify/route.ts app/api/register/route.ts app/register/page.tsx lib/otp/otpService.ts lib/otp/smsProvider.ts lib/otp/cleanupJob.ts prisma/schema.prisma tests/otp/otpService.test.ts
> ```
>
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: feature
- **Planned at**: commit `8d07eea`, 2026-06-26
- **Source issue**: https://github.com/danh2002/khunglongshop/issues/8

## Why this matters

Issue #8 asks to replace SMS OTP in registration with email OTP using Resend.
The repo already has a complete DB-backed OTP lifecycle, rate limiting, token
consumption, cleanup, and register-page integration, but it is named and wired
around Vietnamese phone numbers and `sendSms`. Reusing that lifecycle keeps the
security properties while removing SMS vendor dependencies from the signup
experience.

## Current state

- `app/api/otp/request/route.ts` currently accepts `{ phone }`, calls
  `requestOtp(phone, ip)`, and returns `phoneMasked`.
- `app/api/otp/verify/route.ts` already accepts `{ challengeId, code }` and can
  stay mostly unchanged at the HTTP boundary.
- `app/api/register/route.ts` currently accepts optional `phone`, then
  `consumeToken(...)` returns `{ phone }` and the created user persists that
  phone.
- `app/register/page.tsx` collects email, password, confirm password, phone, and
  OTP in one client component. It calls `/api/otp/request` with `{ phone }`.
- `lib/otp/otpService.ts` owns the lifecycle:
  - `normalizePhone` validates Vietnam mobile numbers.
  - `requestOtp(phone, ip)` creates `OtpChallenge.phone`, rate-limit keys
    `phone:<normalizedPhone>` and `ip:<ip>`, then calls `sendSms`.
  - `verifyOtp(challengeId, code)` enforces expiry, attempts, lock, and token
    rotation.
  - `consumeToken(tx, challengeId, token)` marks the challenge consumed and
    returns `{ phone }`.
- `prisma/schema.prisma` already has `OtpChallenge.phone String` with
  `@@index([phone, status])`. Issue #8 explicitly allows reusing this field for
  email and says not to migrate unless necessary.
- `lib/otp/smsProvider.ts` is the only outbound SMS provider wrapper.
- `tests/otp/otpService.test.ts` mocks `@/lib/otp/smsProvider` and covers the
  phone OTP lifecycle.
- There is an older phone-OTP spec at `specs/issue-2-phone-otp-registration.md`;
  treat it as historical context, not as binding for this issue.
- The repo does not currently depend on `resend`.

## Product requirements from issue #8

- User enters email, password, and name.
- Server sends a 6-digit OTP to that email.
- User enters the OTP and receives a token from `/api/otp/verify`.
- User submits `/api/register` with the OTP token to create the account.
- Email provider: Resend.
- New env vars:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
- Sender may be `noreply@khunglongshop.com` after domain verification, or
  Resend sandbox sender while the domain is not verified.
- Email template must be Vietnamese, branded for Khủng Long Shop, and use Lava
  Orange `#E8430A`.
- OTP is 6 numeric digits and expires after 10 minutes.
- 5 wrong attempts locks the challenge.
- Keep existing DB-backed `OtpRateLimitEvent` logic.
- Keep cleanup cron.
- Remove or disable SMS/phone OTP references from the registration flow.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install deps | `npm install resend` | `package.json` and `package-lock.json` include `resend` |
| Prisma client | `npm run db:generate` | Prisma Client generated, exit 0 |
| Typecheck | `npm run type-check` | exit 0, no TypeScript errors |
| Non-OTP tests | `npx vitest run --exclude "tests/otp/**"` | all non-OTP tests pass |
| OTP tests | `$env:DATABASE_URL='mysql://user:password@localhost:3306/khunglongshop_test'; npx vitest run tests/otp` | pass only in an environment with a reachable test DB |

Do not write real or dummy secrets to any file. Use shell-local env vars only.

## Scope

**In scope**:

- `package.json`
- `package-lock.json`
- `app/api/otp/request/route.ts`
- `app/api/otp/verify/route.ts` only if response/error names need cleanup
- `app/api/register/route.ts`
- `app/register/page.tsx`
- `lib/otp/otpService.ts`
- `lib/otp/smsProvider.ts` only to remove unused imports or leave as orphaned
  compatibility code if other code still references it
- `lib/email.ts` (create)
- `lib/email-templates/otp.tsx` (create)
- `tests/otp/otpService.test.ts`
- focused unit/wiring tests under `tests/unit/` if needed
- docs/env examples if this repo already has one; otherwise do not create a new
  env file

**Out of scope**:

- Do not migrate `OtpChallenge.phone` to a new `email` column in this plan.
- Do not change login, password reset, account profile, checkout, or collection.
- Do not remove OTP cleanup cron.
- Do not delete historical SMS files unless TypeScript proves they are unused
  and deleting them is simpler than keeping them.
- Do not expose raw OTP codes in API responses, browser logs, or production
  server logs.
- Do not publish GitHub issues or push branches.

## Architecture decisions

### Decision 1: Reuse `OtpChallenge.phone` as the email identity

Issue #8 says the existing `OtpChallenge` model can be reused and the `phone`
field can temporarily store email. Use normalized lowercase email values in
that column. This avoids a migration and keeps `@@index([phone, status])`
useful for challenge lookup.

Implementation guidance:

- Internally, rename variables to `email`, `emailIdentity`, or
  `normalizedEmail` where practical.
- Keep DB field access as `phone: normalizedEmail` with a short comment only at
  the write/read boundary.
- Change rate-limit keys from `phone:<value>` to `email:<normalizedEmail>`.
- Avoid broad schema changes. A later cleanup can rename DB columns when the
  product is stable.

### Decision 2: Replace SMS provider with Resend email provider

Create `lib/email.ts` as a small wrapper around the Resend SDK. Resend promotes
React email templates for transactional email, so `lib/email-templates/otp.tsx`
should export a React component for the OTP message. The wrapper should support
test injection like `setEmailSenderForTests(...)` so OTP tests do not send real
email.

### Decision 3: Preserve OTP security semantics

Keep:

- bcrypt hashing for OTP and token hashes
- 5 wrong attempts before lock
- 60-second resend window
- phone/email quota of 3 successful sends per 15 minutes
- IP quota of 10 successful sends per 15 minutes
- provider-failure throttle
- stale reservation cleanup
- token consumption only after successful user creation

Change:

- OTP TTL from 5 minutes to 10 minutes.
- error names and UI copy from phone/SMS wording to email wording.

## API contracts

### `POST /api/otp/request`

Request:

```ts
type RequestOtpBody = {
  email: string;
};
```

Success response:

```ts
type RequestOtpResponse = {
  challengeId: string;
  expiresAt: string;
  resendAfterSeconds: 60;
  emailMasked: string;
};
```

Errors to support:

- `VALIDATION_ERROR`
- `INVALID_EMAIL_FORMAT`
- `EMAIL_ALREADY_EXISTS`
- `OTP_RESEND_NOT_READY`
- `TOO_MANY_OTP_REQUESTS`
- `IP_RATE_LIMITED`
- `EMAIL_PROVIDER_UNAVAILABLE`
- `PROVIDER_FAILURE_THROTTLE`

Compatibility note: do not keep accepting `{ phone }` in the registration UI.
The API may optionally accept `{ phone }` for one release only if existing tests
or callers require it, but the new contract and tests must use `{ email }`.

### `POST /api/otp/verify`

Request remains:

```ts
type VerifyOtpBody = {
  challengeId: string;
  code: string; // exactly 6 digits
};
```

Success remains:

```ts
type VerifyOtpResponse = {
  token: string;
  tokenExpiry: string;
};
```

Update email-related error copy in the UI. You do not need to rename
`PHONE_VERIFICATION_EXPIRED` in this plan if doing so would cause churn, but
new code should prefer `EMAIL_VERIFICATION_EXPIRED` where feasible.

### `POST /api/register`

Request:

```ts
type RegisterBody = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  challengeId: string;
  token: string;
};
```

Rules:

- The email submitted to `/api/register` must match the normalized email stored
  in the consumed OTP challenge.
- `consumeToken(...)` should return `{ email }` or `{ emailIdentity }`, not
  `{ phone }`.
- Create `User` with `email`, password, firstName, lastName, role `user`.
- Do not set `User.phone` from the OTP challenge. If the UI still has optional
  phone collection for profile purposes, it must not be part of OTP.
- Duplicate email remains `409 EMAIL_ALREADY_EXISTS`.

## Steps

### Step 1: Add Resend dependency and email wrapper

Run:

```bash
npm install resend
```

Create `lib/email.ts`:

- Import `Resend` from `resend`.
- Read `RESEND_API_KEY` and `RESEND_FROM_EMAIL` at send time.
- Export a result-shaped sender:

```ts
export type EmailProviderResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export async function sendOtpEmail(to: string, code: string): Promise<EmailProviderResult> {
  // validate env, call resend.emails.send(...)
}

export function setEmailSenderForTests(sender: EmailSender | null) {
  // mirror setSmsSenderForTests pattern
}
```

- If env vars are missing, return `{ success: false, error:
  "EMAIL_PROVIDER_NOT_CONFIGURED" }`; do not throw.
- Catch provider errors and return `{ success: false, error: message }`.
- The Resend send call should use:
  - `from: process.env.RESEND_FROM_EMAIL`
  - `to`
  - Vietnamese subject such as `Mã xác thực Khủng Long Shop`
  - `react: <OtpEmail code={code} />`

Create `lib/email-templates/otp.tsx`:

- Export `OtpEmail({ code }: { code: string })`.
- Use Vietnamese text.
- Use Lava Orange `#E8430A`.
- Include "Khủng Long Shop", the 6-digit code, and "Mã hết hạn sau 10 phút".
- Do not include links or secrets.

**Verify**:

```bash
npm run type-check
```

Expected: exit 0.

### Step 2: Convert OTP service identity from phone to email

In `lib/otp/otpService.ts`:

- Replace `import { sendSms } from "./smsProvider"` with
  `import { sendOtpEmail } from "@/lib/email"`.
- Replace `PHONE_REGEX`, `normalizePhone`, and `maskPhone` with:

```ts
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MS = 10 * 60 * 1000;

export function normalizeOtpEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalized)) {
    throw new OtpServiceError("INVALID_EMAIL_FORMAT", 422);
  }
  return normalized;
}

export function maskEmail(email: string) {
  const normalized = normalizeOtpEmail(email);
  const [local, domain] = normalized.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}
```

- Replace `assertPhoneIsAvailable` with `assertEmailIsAvailable`, checking
  `User.email`.
- Keep DB queries against `OtpChallenge.phone`, but pass normalized email:

```ts
// OtpChallenge.phone stores the registration email for email-OTP.
phone: normalizedEmail
```

- Change rate-limit key from `phone:${normalizedPhone}` to
  `email:${normalizedEmail}`.
- Rename return fields:
  - `RequestOtpResult.phoneMasked` -> `emailMasked`
  - `ConsumeTokenResult.phone` -> `email`
- Replace `sendSms(normalizedPhone, code)` with
  `sendOtpEmail(normalizedEmail, code)`.
- Replace `SMS_PROVIDER_UNAVAILABLE` with `EMAIL_PROVIDER_UNAVAILABLE`.
- Update audit logging to mask email. The schema field is still
  `phoneMasked`; use it to store `maskEmail(email)` and add a boundary comment.

**Verify**:

```bash
rg -n "sendSms|normalizePhone|maskPhone|PHONE_ALREADY_REGISTERED|SMS_PROVIDER_UNAVAILABLE|phoneMasked" lib/otp app/api/otp app/api/register app/register/page.tsx tests/otp
npm run type-check
```

Expected: no active registration-flow matches except possibly historical
compatibility code or tests explicitly asserting old code was removed; typecheck
exits 0.

### Step 3: Update OTP request route

In `app/api/otp/request/route.ts`:

- Change schema from `{ phone: z.string().min(1) }` to
  `{ email: z.string().email() }`.
- Call `requestOtp(parsed.data.email, getClientIp(request))`.
- Return `emailMasked`, not `phoneMasked`.

Keep `challengeId`, `expiresAt`, and `resendAfterSeconds`.

**Verify**:

```bash
npm run type-check
```

Expected: exit 0.

### Step 4: Update registration route token binding

In `app/api/register/route.ts`:

- Remove phone from required OTP flow.
- Keep `phone` optional only if the product still wants to collect it as profile
  data. If kept, do not require it and do not use it for OTP verification.
- After `consumeToken(tx, challengeId, token)`, assert that the returned email
  matches `parsed.data.email.trim().toLowerCase()`.
- If it does not match, throw `EMAIL_VERIFICATION_INVALID` or reuse
  `PHONE_VERIFICATION_INVALID` only if renaming would cause excessive churn.
- Create user with the submitted normalized email. Set `phone` to `null` unless
  an optional phone field is explicitly still present and validated separately.
- Remove duplicate-phone handling from the main registration error path unless
  optional phone remains in the request.
- Keep `SKIP_OTP` dev path working.

**Verify**:

```bash
npm run type-check
```

Expected: exit 0.

### Step 5: Update register page UX

In `app/register/page.tsx`:

- Remove phone validation/state from the OTP requirement.
- Remove `FaPhone` import if unused.
- Keep email, password, confirm password, firstName, lastName state. If the page
  currently does not collect first and last name, either:
  - add two compact inputs for họ/tên, or
  - keep sending empty strings only if that is already the accepted product
    behavior.
- Change `requestOtp()` to validate `email`, then call:

```ts
body: JSON.stringify({ email: email.trim().toLowerCase() })
```

- Show success copy like `Đã gửi mã OTP đến email ${emailMasked}`.
- Replace SMS/phone error copy with email copy:
  - `EMAIL_ALREADY_EXISTS`: `Email đã được sử dụng`
  - `EMAIL_PROVIDER_UNAVAILABLE`: `Không thể gửi email lúc này`
  - `INVALID_EMAIL_FORMAT`: `Email không hợp lệ`
- Keep the 60-second resend countdown.
- Keep OTP input at 6 digits.
- Final submit sends no OTP phone field.
- Use the existing dark auth card style and orange CTA; do not redesign the
  page.

**Verify**:

```bash
rg -n "phone|Phone|SMS|sms|Số điện thoại|sendSms|PHONE_" app/register/page.tsx
npm run type-check
```

Expected: no registration-flow phone/SMS references remain except optional
profile-phone UI if deliberately kept and documented; typecheck exits 0.

### Step 6: Update tests

In `tests/otp/otpService.test.ts`:

- Mock `@/lib/email`, not `@/lib/otp/smsProvider`.
- Replace phone constants with email constants:

```ts
const TEST_EMAIL = "user@example.com";
const SECOND_EMAIL = "other@example.com";
```

- Replace `normalizePhone` tests with `normalizeOtpEmail` and `maskEmail`.
- Update rate-limit key assertions from `phone:<value>` to `email:<value>`.
- Replace SMS send assertions with email send assertions.
- Cover:
  - happy path sends email
  - invalid email throws `INVALID_EMAIL_FORMAT`
  - duplicate email throws `EMAIL_ALREADY_EXISTS`
  - provider failure expires challenge and throws `EMAIL_PROVIDER_UNAVAILABLE`
  - wrong OTP locks on 5th attempt
  - challenge TTL is 10 minutes
  - consume token returns email and rejects token/email mismatch through
    register route or service-level helper

If there are existing lightweight wiring tests in `tests/unit/`, add one that
asserts:

- `app/api/otp/request/route.ts` reads `email`
- `app/register/page.tsx` posts `{ email }` to `/api/otp/request`
- no active registration UI string mentions SMS or phone OTP

**Verify**:

```bash
$env:DATABASE_URL='mysql://user:password@localhost:3306/khunglongshop_test'; npx vitest run tests/otp
npx vitest run --exclude "tests/otp/**"
```

Expected: OTP tests pass when a test DB is reachable; non-OTP tests pass.

### Step 7: Environment and cleanup review

- Do not change `prisma/schema.prisma`.
- Do not change `app/api/cron/otp-cleanup/route.ts` unless type errors require
  renaming imports.
- Add env var documentation only in an existing env/example doc if present.
  Required names:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
- If no env example exists, mention env vars in the PR notes and do not create a
  new secrets file.

**Verify**:

```bash
rg -n "SMS_PROVIDER_URL|SMS_API_KEY|SMS_FROM_NUMBER|SMS_TIMEOUT_MS|RESEND_API_KEY|RESEND_FROM_EMAIL" README.md specs plans app lib tests package.json
npm run type-check
```

Expected: SMS env vars are no longer required for registration OTP; Resend env
vars are documented somewhere appropriate or called out in final notes.

## Test plan

- Update `tests/otp/otpService.test.ts` from phone/SMS to email/Resend.
- Add or update a wiring test under `tests/unit/` if route-level tests are too
  expensive.
- Manual smoke with a real Resend API key:
  1. Start dev server with `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
  2. Open `/register`.
  3. Enter email/password/name.
  4. Request OTP.
  5. Confirm email arrives and contains a 6-digit code.
  6. Verify code.
  7. Submit registration.
  8. Confirm redirect to `/login`.

## Done criteria

- [ ] `package.json` and `package-lock.json` include `resend`.
- [ ] `lib/email.ts` sends OTP mail through Resend and supports test injection.
- [ ] `lib/email-templates/otp.tsx` exists, is Vietnamese, and uses `#E8430A`.
- [ ] `POST /api/otp/request` accepts `email`, not `phone`.
- [ ] Registration UI requests OTP by email and no longer requires phone for OTP.
- [ ] OTP TTL is 10 minutes.
- [ ] 5 wrong attempts lock the challenge.
- [ ] Existing cleanup cron remains active.
- [ ] Rate limiting still uses `OtpRateLimitEvent`.
- [ ] No registration-flow references to SMS provider remain.
- [ ] `npm run type-check` exits 0.
- [ ] `npx vitest run --exclude "tests/otp/**"` exits 0.
- [ ] OTP tests pass in an environment with a live test DB.
- [ ] Manual Resend smoke test passes or is documented as pending due missing
  Resend credentials.

## STOP conditions

Stop and report back if:

- Product owner decides to add `OtpChallenge.email`; that requires a migration
  and a refreshed plan.
- Resend SDK typings require adding a second email-rendering package beyond
  `resend`; report the exact TypeScript error before adding more dependencies.
- Tests require a live DB and none is available after non-OTP tests pass; do not
  fake DB-backed OTP success.
- The implementation requires changing login, password reset, checkout, or
  account profile.
- The code at `lib/otp/otpService.ts` no longer owns OTP request/verify/consume.

## Maintenance notes

- `OtpChallenge.phone` and `OtpAuditLog.phoneMasked` will be semantic debt after
  this lands because they will store email identity/masked email. Track a future
  migration to rename those columns when product behavior is stable.
- Reviewers should scrutinize that raw OTP values never appear in API responses
  or client logs.
- Reviewers should verify the email address used in `/api/register` is the same
  address verified by the OTP challenge.
- Keep the old `lib/otp/smsProvider.ts` only if unused-code cleanup is deferred;
  it should not be part of registration after this plan.
- Resend SDK typings require installing `@react-email/components` or any
  additional email rendering package; use plain HTML string template instead.