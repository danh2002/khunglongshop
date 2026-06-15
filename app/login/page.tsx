"use client";

import SectionTitle from "@/components/SectionTitle";
import { Field, PrimaryButton, SectionShell, Wrapper } from "@/components/design-system";
import { isValidEmailAddressFormat } from "@/lib/utils";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import styled from "styled-components";

const AuthWrap = styled(Wrapper)`
  min-height: 62vh;
  display: grid;
  place-items: center;
`;

const AuthCard = styled.div`
  width: min(100%, 440px);
  padding: clamp(1.4rem, 4vw, 2.2rem);
  background: rgba(10, 10, 10, 0.92);
  border: 1px solid rgba(255, 106, 0, 0.16);
  box-shadow: 0 20px 46px rgba(0, 0, 0, 0.45);
`;

const Title = styled.h2`
  margin: 0 0 1.5rem;
  color: rgba(255, 255, 255, 0.88);
  font-size: 1.7rem;
  font-style: italic;
  font-weight: 900;
  text-align: center;
  text-transform: uppercase;
`;

const Form = styled.form`
  display: grid;
  gap: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.45rem;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.82rem;
  font-weight: 900;
  text-transform: uppercase;
`;

const SmallRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.86rem;

  a {
    color: rgba(255, 255, 255, 0.72);
    text-decoration: none;
  }

  a:hover {
    color: #e85d00;
  }
`;

const ErrorText = styled.p`
  min-height: 1.5rem;
  margin: 1rem 0 0;
  color: #ff6a00;
  text-align: center;
`;

const AuthDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: #555;
  font-size: 13px;
  margin: 20px 0;

  &::before,
  &::after {
    content: "";
    flex: 1;
    border-top: 1px solid #222;
  }
`;

const AuthPrompt = styled.p`
  margin: 0;
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

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const { data: session, status: sessionStatus } = useSession();
  const rawCallbackUrl = searchParams.get("redirect") || searchParams.get("callbackUrl") || "/account";
  const callbackUrl = rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//") ? rawCallbackUrl : "/account";

  useEffect(() => {
    const expired = searchParams.get("expired");
    if (expired === "true") {
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }

    if (sessionStatus === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [sessionStatus, router, searchParams, callbackUrl]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    if (!isValidEmailAddressFormat(email)) {
      setError("Email không hợp lệ");
      toast.error("Email không hợp lệ");
      return;
    }

    if (!password) {
      setError("Mật khẩu không hợp lệ");
      toast.error("Mật khẩu không hợp lệ");
      return;
    }

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Email hoặc mật khẩu không đúng");
      toast.error("Email hoặc mật khẩu không đúng");
    } else {
      setError("");
      toast.success("Đăng nhập thành công");
      router.replace(callbackUrl);
    }
  };

  if (sessionStatus === "loading") {
    return <h1>Loading...</h1>;
  }

  return (
    <div>
      <SectionTitle title="Đăng nhập" path="Trang chủ | Đăng nhập" />
      <SectionShell>
        <AuthWrap>
          <AuthCard>
            <Title>Đăng nhập tài khoản</Title>
            <Form onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="email">Email</Label>
                <Field id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div>
                <Label htmlFor="password">Mật khẩu</Label>
                <Field id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <SmallRow>
                <label>
                  <input id="remember-me" name="remember-me" type="checkbox" /> Ghi nhớ tôi
                </label>
                <a href="#">Quên mật khẩu?</a>
              </SmallRow>
              <PrimaryButton type="submit">Đăng nhập</PrimaryButton>
              <AuthDivider>hoặc</AuthDivider>
              <AuthPrompt>
                Chưa có tài khoản?
                <Link href="/register">Đăng ký ngay →</Link>
              </AuthPrompt>
            </Form>
            <ErrorText>{error && error}</ErrorText>
          </AuthCard>
        </AuthWrap>
      </SectionShell>
    </div>
  );
};

export default LoginPage;
