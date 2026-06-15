"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaArrowRight, FaEye, FaEyeSlash, FaKey, FaLock, FaPhone, FaRegUser } from "react-icons/fa6";
import styled from "styled-components";

type ApiPayload = {
  error?: string;
  challengeId?: string;
  expiresAt?: string;
  resendAfterSeconds?: number;
  retryAfterSeconds?: number;
  token?: string;
  tokenExpiry?: string;
  phoneMasked?: string;
  attemptsRemaining?: number;
};

type PasswordStrength = {
  level: "weak" | "medium" | "strong";
  label: string;
};

const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
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

function compactPhone(value: string) {
  return value.replace(/[\s().-]/g, "");
}

function isValidVietnamPhone(value: string) {
  return PHONE_REGEX.test(compactPhone(value));
}

function normalizePhone(value: string) {
  const compact = compactPhone(value);
  return compact.startsWith("+84") ? `0${compact.slice(3)}` : compact;
}

function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;

  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (password.length >= 8 && hasMixedCase && hasNumber) {
    return { level: "strong", label: "Mật khẩu mạnh" };
  }

  if (password.length >= 6 && (hasMixedCase || hasNumber)) {
    return { level: "medium", label: "Mật khẩu trung bình" };
  }

  return { level: "weak", label: "Mật khẩu yếu" };
}

async function readJson(response: Response): Promise<ApiPayload> {
  return response.json().catch(() => ({}));
}

const RegisterPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
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
  const phoneIsValid = useMemo(() => isValidVietnamPhone(phone), [phone]);
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const setErrorMessage = (value: string) => {
    setError(value);
    setMessage("");
    toast.error(value);
  };

  const requestOtp = async () => {
    if (!phoneIsValid) {
      setErrorMessage("Số điện thoại không hợp lệ");
      return;
    }

    setIsRequestingOtp(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const payload = await readJson(response);

      if (response.ok || payload.error === "OTP_RESEND_NOT_READY") {
        if (payload.challengeId) setChallengeId(payload.challengeId);
        const waitSeconds = payload.resendAfterSeconds ?? payload.retryAfterSeconds ?? 60;
        setResendReadyAt(Date.now() + waitSeconds * 1000);
        setToken("");

        if (payload.error === "OTP_RESEND_NOT_READY") {
          setError("Vui lòng đợi trước khi lấy mã mới");
          return;
        }

        const targetPhone = payload.phoneMasked || normalizePhone(phone);
        setMessage(`Đã gửi mã OTP đến số ${targetPhone}`);
        toast.success("Đã gửi mã OTP");
        return;
      }

      const messages: Record<string, string> = {
        PHONE_ALREADY_REGISTERED: "Số điện thoại đã được đăng ký",
        TOO_MANY_OTP_REQUESTS: "Bạn đã yêu cầu quá nhiều mã",
        IP_RATE_LIMITED: "Có quá nhiều yêu cầu từ mạng này",
        SMS_PROVIDER_UNAVAILABLE: "Không thể gửi SMS lúc này",
        PROVIDER_FAILURE_THROTTLE: "Không thể gửi SMS lúc này",
        INVALID_PHONE_FORMAT: "Số điện thoại không hợp lệ",
      };
      setErrorMessage(messages[payload.error || ""] || "Không thể lấy mã xác thực");
    } catch {
      setErrorMessage("Không thể lấy mã xác thực");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const validateForm = () => {
    if (!EMAIL_REGEX.test(email.trim())) {
      setErrorMessage("Email không hợp lệ");
      return false;
    }

    if (!PASSWORD_REGEX.test(password) || password.length < 8) {
      setErrorMessage("Mật khẩu cần có chữ hoa, chữ thường, số và ký tự đặc biệt");
      return false;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu nhập lại không khớp");
      return false;
    }

    if (!SKIP_OTP && !phoneIsValid) {
      setErrorMessage("Số điện thoại không hợp lệ");
      return false;
    }

    if (SKIP_OTP && phone.trim() && !phoneIsValid) {
      setErrorMessage("Số điện thoại không hợp lệ");
      return false;
    }

    if (!SKIP_OTP && !challengeId) {
      setErrorMessage("Vui lòng lấy mã xác thực");
      return false;
    }

    if (!SKIP_OTP && !/^\d{6}$/.test(otpCode)) {
      setErrorMessage("Vui lòng nhập mã xác thực 6 số");
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
      INVALID_OTP: "Mã xác thực không đúng",
      CHALLENGE_LOCKED: "Bạn đã nhập sai quá nhiều lần",
      CHALLENGE_EXPIRED: "Mã xác thực đã hết hạn",
      PHONE_VERIFICATION_EXPIRED: "Phiên xác thực đã hết hạn",
      TOKEN_ALREADY_CONSUMED: "Mã xác thực đã được sử dụng",
      OTP_NOT_FOUND: "Mã xác thực không tồn tại",
    };
    throw new Error(messages[payload.error || ""] || "Không thể xác thực mã OTP");
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
          firstName: "",
          lastName: "",
          phone: phone.trim() ? normalizePhone(phone) : "",
          challengeId: SKIP_OTP ? "SKIP_OTP_DEV" : challengeId,
          token: verifiedToken,
        }),
      });
      const payload = await readJson(response);

      if (response.status === 201) {
        toast.success("Đăng ký thành công!");
        router.push("/login");
        return;
      }

      const messages: Record<string, string> = {
        EMAIL_ALREADY_EXISTS: "Email đã được sử dụng",
        PHONE_ALREADY_REGISTERED: "Số điện thoại đã được đăng ký",
        TOKEN_ALREADY_CONSUMED: "Mã xác thực đã được sử dụng",
        PHONE_VERIFICATION_EXPIRED: "Phiên xác thực đã hết hạn",
        INVALID_TOKEN: "Phiên xác thực không hợp lệ",
        VALIDATION_ERROR: "Vui lòng kiểm tra lại thông tin đăng ký",
      };
      setErrorMessage(messages[payload.error || ""] || "Không thể đăng ký");
    } catch (submitError) {
      setErrorMessage(submitError instanceof Error ? submitError.message : "Không thể đăng ký");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell>
      <Card>
        <Header>
          <Logo src="/images/logo.png" alt="Khủng Long Shop" />
          <Title>Khủng Long Shop</Title>
          <Subtitle>Tạo tài khoản để bắt đầu sưu tầm!</Subtitle>
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
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                autoComplete="email"
                required
              />
            </InputGroup>
          </FieldBlock>

          <FieldBlock>
            <Label htmlFor="register-password">Mật khẩu *</Label>
            <InputGroup>
              <InputIcon><FaLock /></InputIcon>
              <PasswordField
                id="register-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mật khẩu"
                autoComplete="new-password"
                required
              />
              <ToggleButton type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Hiện hoặc ẩn mật khẩu">
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
            <Label htmlFor="register-confirm-password">Nhập lại mật khẩu *</Label>
            <InputGroup>
              <InputIcon><FaLock /></InputIcon>
              <PasswordField
                id="register-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                required
              />
              <ToggleButton type="button" onClick={() => setShowConfirmPassword((value) => !value)} aria-label="Hiện hoặc ẩn mật khẩu nhập lại">
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </ToggleButton>
            </InputGroup>
          </FieldBlock>

          <FieldBlock>
            <Label htmlFor="register-phone">Số điện thoại</Label>
            <InputGroup>
              <InputIcon><FaPhone /></InputIcon>
              <Field
                id="register-phone"
                type="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setChallengeId("");
                  setToken("");
                }}
                placeholder="0912 345 678"
                autoComplete="tel"
                required={!SKIP_OTP}
              />
            </InputGroup>
          </FieldBlock>

          {!SKIP_OTP && (
            <FieldBlock>
              <Label htmlFor="register-otp">Mã xác thực 6 số *</Label>
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
                    placeholder="Mã xác thực 6 số"
                    required
                  />
                </InputGroup>
                <OtpButton type="button" disabled={isRequestingOtp || resendSeconds > 0} onClick={requestOtp}>
                  {resendSeconds > 0 ? `${resendSeconds}s` : "Lấy mã xác thực"}
                </OtpButton>
              </OtpRow>
            </FieldBlock>
          )}

          {(message || error) && <Message $tone={message ? "success" : "error"}>{message || error}</Message>}

          <SubmitButton type="submit" disabled={isSubmitting}>
            <span>Đăng ký <FaArrowRight /></span>
          </SubmitButton>
        </Form>

        <LoginPrompt>
          Đã có tài khoản?
          <Link href="/login">Đăng nhập ngay →</Link>
        </LoginPrompt>
      </Card>
    </PageShell>
  );
};

export default RegisterPage;
