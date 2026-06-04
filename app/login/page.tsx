"use client";

import { SectionTitle } from "@/components";
import { Field, PrimaryButton, SectionShell, Wrapper } from "@/components/design-system";
import { isValidEmailAddressFormat } from "@/lib/utils";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
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

const SocialGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const SocialButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 106, 0, 0.16);
  color: rgba(255, 255, 255, 0.88);
  cursor: pointer;
  font-weight: 900;
`;

const ErrorText = styled.p`
  min-height: 1.5rem;
  margin: 1rem 0 0;
  color: #ff6a00;
  text-align: center;
`;

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const { data: session, status: sessionStatus } = useSession();

  useEffect(() => {
    const expired = searchParams.get("expired");
    if (expired === "true") {
      setError("Your session has expired. Please log in again.");
      toast.error("Your session has expired. Please log in again.");
    }

    if (sessionStatus === "authenticated") {
      router.replace("/");
    }
  }, [sessionStatus, router, searchParams]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;

    if (!isValidEmailAddressFormat(email)) {
      setError("Email is invalid");
      toast.error("Email is invalid");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password is invalid");
      toast.error("Password is invalid");
      return;
    }

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Invalid email or password");
      toast.error("Invalid email or password");
      if (res?.url) router.replace("/");
    } else {
      setError("");
      toast.success("Successful login");
    }
  };

  if (sessionStatus === "loading") {
    return <h1>Loading...</h1>;
  }

  return (
    <div>
      <SectionTitle title="Login" path="Home | Login" />
      <SectionShell>
        <AuthWrap>
          <AuthCard>
            <Title>Sign in to your account</Title>
            <Form onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="email">Email address</Label>
                <Field id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Field id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <SmallRow>
                <label>
                  <input id="remember-me" name="remember-me" type="checkbox" /> Remember me
                </label>
                <a href="#">Forgot password?</a>
              </SmallRow>
              <PrimaryButton type="submit">Sign in</PrimaryButton>
            </Form>
            <SocialGrid>
              <SocialButton onClick={() => signIn("google")}>
                <FcGoogle />
                Google
              </SocialButton>
              <SocialButton onClick={() => signIn("github")}>GitHub</SocialButton>
            </SocialGrid>
            <ErrorText>{error && error}</ErrorText>
          </AuthCard>
        </AuthWrap>
      </SectionShell>
    </div>
  );
};

export default LoginPage;
