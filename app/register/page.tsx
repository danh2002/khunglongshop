"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaArrowRight, FaEye, FaEyeSlash, FaKey, FaLock, FaRegUser } from "react-icons/fa6";
import styled from "styled-components";

type ApiPayload = {
  error?: string;
  challengeId?: string;
  expiresAt?: string;
  resendAfterSeconds?: number;
  retryAfterSeconds?: number;
  token?: string;
  tokenExpiry?: string;
  emailMasked?: string;
  attemptsRemaining?: number;
};

type PasswordStrength = {
  level: "weak" | "medium" | "strong";
  label: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
const SKIP_OTP = process.env.NEXT_PUBLIC_SKIP_OTP === "true";

const PageShell = styled.main`
  min-height: calc(100vh - 120px);
  display: grid;
  place-items: start center;
  padding: 1px 16px 48px;
  background: #070707;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(232, 93, 0, 0.06) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const Card = styled.section`
  width: min(100%, 420px);
  max-width: 420px;
  margin: 60px auto;
  padding: 40px 32px;
  border-radius: 16px;
  background: #111111;
  border: 1px solid #1e1e1e;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 1;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 24px;
`;

const Logo = styled.img`
  width: 78px;
  height: 78px;
  object-fit: contain;
  display: block;
  margin: 0 auto 14px;
`;

const Title = styled.h1`
  margin: 0;
  color: #fff;
  font-size: 1.65rem;
  font-weight: 900;
  text-transform: uppercase;
`;

const Subtitle = styled.p`
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.95rem;
`;

const Form = styled.form`
  display: grid;
  gap: 14px;
`;

const FieldBlock = styled.div`
  display: grid;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 12px;
  color: #888;
  margin-bottom: 0;
  display: block;
`;

const InputGroup = styled.div`
  position: relative;
`;

const InputIcon = styled.span`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #e85d00;
  display: inline-flex;
  pointer-events: none;
  z-index: 1;
`;

const Field = styled.input`
  width: 100%;
  height: 48px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 13px 16px 13px 44px;
  color: #ffffff;
  font-size: 15px;
  outline: none;

  &::placeholder {
    color: #555;
  }

  &:focus {
    border-color: #e85d00;
    outline: none;
    box-shadow: 0 0 0 2px rgba(232, 93, 0, 0.15);
  }
`;

const PasswordField = styled(Field)`
  padding-right: 44px;
`;

const ToggleButton = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  border: none;
  background: transparent;
  color: #e85d00;
  cursor: pointer;
`;

const StrengthWrap = styled.div`
  display: grid;
  gap: 5px;
  margin-top: 6px;
`;

const StrengthTrack = styled.div`
  height: 3px;
  border-radius: 2px;
  background: #2a2a2a;
  overflow: hidden;
`;

const StrengthBar = styled.div<{ $level: PasswordStrength["level"] }>`
  height: 3px;
  border-radius: 2px;
  width: ${({ $level }) => ($level === "weak" ? "33%" : $level === "medium" ? "66%" : "100%")};
  background: ${({ $level }) => ($level === "weak" ? "#dc2626" : $level === "medium" ? "#e85d00" : "#22c55e")};
  transition: all 0.3s;
`;

const StrengthText = styled.span<{ $level: PasswordStrength["level"] }>`
  color: ${({ $level }) => ($level === "weak" ? "#f87171" : $level === "medium" ? "#ff9f45" : "#4ade80")};
  font-size: 12px;
`;

const OtpRow = styled.div`
  display: flex;
  gap: 8px;

  input {
    flex: 1;
  }
`;

const OtpButton = styled.button`
  background: #e85d00;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 0 16px;
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;

  &:disabled {
    background: #888;
    cursor: not-allowed;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  min-height: 52px;
  margin-top: 8px;
  border: none;
  color: #fff;
  background: linear-gradient(135deg, #e85d00, #ff7a1a);
  border-radius: 10px;
  padding: 15px;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease;

  &:hover {
    background: linear-gradient(135deg, #ff6a00, #ff8c2a);
    transform: translateY(-1px);
  }

  &:disabled {
    background: #333;
    cursor: not-allowed;
    transform: none;
  }

  span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
`;

const Message = styled.p<{ $tone?: "success" | "error" }>`
  min-height: 20px;
  margin: 0;
  color: ${({ $tone }) => ($tone === "success" ? "#6ee184" : "#ff9b69")};
  font-size: 0.86rem;
  text-align: center;
`;

const LoginPrompt = styled.p`
  margin: 20px 0 0;
  text-align: center;
  font-size: 14px;
  color: #888;

  a {
    color: #e85d00;
    font-weight: 700;
    text-decoration: none;
    margin-left: 6px;
  }

  a:hover {
    text-decoration: underline;
  }
`;

function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;

  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (password.length >= 8 && hasMixedCase && hasNumber) {
    return { level: "strong", label: "Máº­t kháº©u máº¡nh" };
  }

  if (password.length >= 6 && (hasMixedCase || hasNumber)) {
    return { level: "medium", label: "Máº­t kháº©u trung bÃ¬nh" };
  }

  return { level: "weak", label: "Máº­t kháº©u yáº¿u" };
}

async function readJson(response: Response): Promise<ApiPayload> {
  return response.json().catch(() => ({}));
}

const RegisterPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [token, setToken] = useState("");
  const [resendReadyAt, setResendReadyAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const resendSeconds = Math.max(0, Math.ceil((resendReadyAt - now) / 1000));
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const emailIsValid = useMemo(() => EMAIL_REGEX.test(normalizedEmail), [normalizedEmail]);
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const setErrorMessage = (value: string) => {
    setError(value);
    setMessage("");
    toast.error(value);
  };

  const requestOtp = async () => {
    if (!emailIsValid) {
      setErrorMessage("Email khÃ´ng há»£p lá»‡");
      return;
    }

    setIsRequestingOtp(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const payload = await readJson(response);

      if (response.ok || payload.error === "OTP_RESEND_NOT_READY") {
        if (payload.challengeId) setChallengeId(payload.challengeId);
        const waitSeconds = payload.resendAfterSeconds ?? payload.retryAfterSeconds ?? 60;
        setResendReadyAt(Date.now() + waitSeconds * 1000);
        setToken("");

        if (payload.error === "OTP_RESEND_NOT_READY") {
          setError("Vui lÃ²ng Ä‘á»£i trÆ°á»›c khi láº¥y mÃ£ má»›i");
          return;
        }

        const targetEmail = payload.emailMasked || normalizedEmail;
        setMessage(`ÄÃ£ gá»­i mÃ£ OTP Ä‘áº¿n email ${targetEmail}`);
        toast.success("ÄÃ£ gá»­i mÃ£ OTP");
        return;
      }

      const messages: Record<string, string> = {
        EMAIL_ALREADY_EXISTS: "Email Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng",
        TOO_MANY_OTP_REQUESTS: "Báº¡n Ä‘Ã£ yÃªu cáº§u quÃ¡ nhiá»u mÃ£",
        IP_RATE_LIMITED: "CÃ³ quÃ¡ nhiá»u yÃªu cáº§u tá»« máº¡ng nÃ y",
        EMAIL_PROVIDER_DOMAIN_NOT_VERIFIED: "Email chỉ gửi được sau khi cấu hình domain gửi mail",
        EMAIL_PROVIDER_UNAVAILABLE: "KhÃ´ng thá»ƒ gá»­i email lÃºc nÃ y",
        PROVIDER_FAILURE_THROTTLE: "KhÃ´ng thá»ƒ gá»­i email lÃºc nÃ y",
        INVALID_EMAIL_FORMAT: "Email khÃ´ng há»£p lá»‡",
      };
      setErrorMessage(messages[payload.error || ""] || "KhÃ´ng thá»ƒ láº¥y mÃ£ xÃ¡c thá»±c");
    } catch {
      setErrorMessage("KhÃ´ng thá»ƒ láº¥y mÃ£ xÃ¡c thá»±c");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const validateForm = () => {
    if (!emailIsValid) {
      setErrorMessage("Email khÃ´ng há»£p lá»‡");
      return false;
    }

    if (!PASSWORD_REGEX.test(password) || password.length < 8) {
      setErrorMessage("Máº­t kháº©u cáº§n cÃ³ chá»¯ hoa, chá»¯ thÆ°á»ng, sá»‘ vÃ  kÃ½ tá»± Ä‘áº·c biá»‡t");
      return false;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Máº­t kháº©u nháº­p láº¡i khÃ´ng khá»›p");
      return false;
    }

    if (!SKIP_OTP && !challengeId) {
      setErrorMessage("Vui lÃ²ng láº¥y mÃ£ xÃ¡c thá»±c");
      return false;
    }

    if (!SKIP_OTP && !/^\d{6}$/.test(otpCode)) {
      setErrorMessage("Vui lÃ²ng nháº­p mÃ£ xÃ¡c thá»±c 6 sá»‘");
      return false;
    }

    return true;
  };

  const verifyOtp = async () => {
    if (token) return token;

    const response = await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, code: otpCode }),
    });
    const payload = await readJson(response);

    if (response.ok && payload.token) {
      setToken(payload.token);
      return payload.token;
    }

    const messages: Record<string, string> = {
      INVALID_OTP: "MÃ£ xÃ¡c thá»±c khÃ´ng Ä‘Ãºng",
      CHALLENGE_LOCKED: "Báº¡n Ä‘Ã£ nháº­p sai quÃ¡ nhiá»u láº§n",
      CHALLENGE_EXPIRED: "MÃ£ xÃ¡c thá»±c Ä‘Ã£ háº¿t háº¡n",
      EMAIL_VERIFICATION_EXPIRED: "PhiÃªn xÃ¡c thá»±c Ä‘Ã£ háº¿t háº¡n",
      TOKEN_ALREADY_CONSUMED: "MÃ£ xÃ¡c thá»±c Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng",
      OTP_NOT_FOUND: "MÃ£ xÃ¡c thá»±c khÃ´ng tá»“n táº¡i",
    };
    throw new Error(messages[payload.error || ""] || "KhÃ´ng thá»ƒ xÃ¡c thá»±c mÃ£ OTP");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const verifiedToken = SKIP_OTP ? "SKIP_OTP_DEV" : await verifyOtp();
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          challengeId: SKIP_OTP ? "SKIP_OTP_DEV" : challengeId,
          token: verifiedToken,
        }),
      });
      const payload = await readJson(response);

      if (response.status === 201) {
        toast.success("ÄÄƒng kÃ½ thÃ nh cÃ´ng!");
        router.push("/login");
        return;
      }

      const messages: Record<string, string> = {
        EMAIL_ALREADY_EXISTS: "Email Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng",
        TOKEN_ALREADY_CONSUMED: "MÃ£ xÃ¡c thá»±c Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng",
        EMAIL_VERIFICATION_EXPIRED: "PhiÃªn xÃ¡c thá»±c Ä‘Ã£ háº¿t háº¡n",
        EMAIL_VERIFICATION_INVALID: "Email chÆ°a Ä‘Æ°á»£c xÃ¡c thá»±c",
        INVALID_TOKEN: "PhiÃªn xÃ¡c thá»±c khÃ´ng há»£p lá»‡",
        VALIDATION_ERROR: "Vui lÃ²ng kiá»ƒm tra láº¡i thÃ´ng tin Ä‘Äƒng kÃ½",
      };
      setErrorMessage(messages[payload.error || ""] || "KhÃ´ng thá»ƒ Ä‘Äƒng kÃ½");
    } catch (submitError) {
      setErrorMessage(submitError instanceof Error ? submitError.message : "KhÃ´ng thá»ƒ Ä‘Äƒng kÃ½");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell>
      <Card>
        <Header>
          <Logo src="/images/logo.png" alt="Khá»§ng Long Shop" />
          <Title>Khá»§ng Long Shop</Title>
          <Subtitle>Táº¡o tÃ i khoáº£n Ä‘á»ƒ báº¯t Ä‘áº§u sÆ°u táº§m!</Subtitle>
        </Header>

        <Form onSubmit={handleSubmit}>
          <FieldBlock>
            <Label htmlFor="register-email">Email *</Label>
            <InputGroup>
              <InputIcon><FaRegUser /></InputIcon>
              <Field
                id="register-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setChallengeId("");
                  setToken("");
                  setOtpCode("");
                }}
                placeholder="Email"
                autoComplete="email"
                required
              />
            </InputGroup>
          </FieldBlock>

          <FieldBlock>
            <Label htmlFor="register-first-name">TÃªn</Label>
            <InputGroup>
              <InputIcon><FaRegUser /></InputIcon>
              <Field
                id="register-first-name"
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="TÃªn"
                autoComplete="given-name"
              />
            </InputGroup>
          </FieldBlock>

          <FieldBlock>
            <Label htmlFor="register-last-name">Há»</Label>
            <InputGroup>
              <InputIcon><FaRegUser /></InputIcon>
              <Field
                id="register-last-name"
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Há»"
                autoComplete="family-name"
              />
            </InputGroup>
          </FieldBlock>

          <FieldBlock>
            <Label htmlFor="register-password">Máº­t kháº©u *</Label>
            <InputGroup>
              <InputIcon><FaLock /></InputIcon>
              <PasswordField
                id="register-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Máº­t kháº©u"
                autoComplete="new-password"
                required
              />
              <ToggleButton type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Hiá»‡n hoáº·c áº©n máº­t kháº©u">
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </ToggleButton>
            </InputGroup>
            {passwordStrength && (
              <StrengthWrap>
                <StrengthTrack>
                  <StrengthBar $level={passwordStrength.level} />
                </StrengthTrack>
                <StrengthText $level={passwordStrength.level}>{passwordStrength.label}</StrengthText>
              </StrengthWrap>
            )}
          </FieldBlock>

          <FieldBlock>
            <Label htmlFor="register-confirm-password">Nháº­p láº¡i máº­t kháº©u *</Label>
            <InputGroup>
              <InputIcon><FaLock /></InputIcon>
              <PasswordField
                id="register-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Nháº­p láº¡i máº­t kháº©u"
                autoComplete="new-password"
                required
              />
              <ToggleButton type="button" onClick={() => setShowConfirmPassword((value) => !value)} aria-label="Hiá»‡n hoáº·c áº©n máº­t kháº©u nháº­p láº¡i">
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </ToggleButton>
            </InputGroup>
          </FieldBlock>

          {!SKIP_OTP && (
            <FieldBlock>
              <Label htmlFor="register-otp">MÃ£ xÃ¡c thá»±c 6 sá»‘ *</Label>
              <OtpRow>
                <InputGroup>
                  <InputIcon><FaKey /></InputIcon>
                  <Field
                    id="register-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(event) => {
                      setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                      setToken("");
                    }}
                    placeholder="MÃ£ xÃ¡c thá»±c 6 sá»‘"
                    required
                  />
                </InputGroup>
                <OtpButton type="button" disabled={isRequestingOtp || resendSeconds > 0} onClick={requestOtp}>
                  {resendSeconds > 0 ? `${resendSeconds}s` : "Láº¥y mÃ£ xÃ¡c thá»±c"}
                </OtpButton>
              </OtpRow>
            </FieldBlock>
          )}

          {(message || error) && <Message $tone={message ? "success" : "error"}>{message || error}</Message>}

          <SubmitButton type="submit" disabled={isSubmitting}>
            <span>ÄÄƒng kÃ½ <FaArrowRight /></span>
          </SubmitButton>
        </Form>

        <LoginPrompt>
          ÄÃ£ cÃ³ tÃ i khoáº£n?
          <Link href="/login">ÄÄƒng nháº­p ngay â†’</Link>
        </LoginPrompt>
      </Card>
    </PageShell>
  );
};

export default RegisterPage;
