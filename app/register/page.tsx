"use client";

import { SectionTitle } from "@/components";
import { Field, PrimaryButton, SectionShell, Wrapper } from "@/components/design-system";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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

const Terms = styled.label`
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.86rem;
`;

const ErrorText = styled.p`
  min-height: 1.5rem;
  margin: 1rem 0 0;
  color: #ff6a00;
  text-align: center;
`;

const RegisterPage = () => {
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      router.replace("/");
    }
  }, [sessionStatus, router]);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const email = e.target[2].value;
    const password = e.target[3].value;
    const confirmPassword = e.target[4].value;

    if (!isValidEmail(email)) {
      setError("Email is invalid");
      toast.error("Email is invalid");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be 8 characters long");
      toast.error("Password must be 8 characters long");
      return;
    }

    if (confirmPassword !== password) {
      setError("Passwords are not equal");
      toast.error("Passwords are not equal");
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setError("");
        toast.success("Registration successful");
        router.push("/login");
      } else {
        if (data.details && Array.isArray(data.details)) {
          const errorMessage = data.details.map((err: any) => err.message).join(", ");
          setError(errorMessage);
          toast.error(errorMessage);
        } else if (data.error) {
          setError(data.error);
          toast.error(data.error);
        } else {
          setError("Registration failed");
          toast.error("Registration failed");
        }
      }
    } catch (error) {
      toast.error("Error, try again");
      setError("Error, try again");
      console.log(error);
    }
  };

  if (sessionStatus === "loading") {
    return <h1>Loading...</h1>;
  }

  return (
    <div>
      <SectionTitle title="Register" path="Home | Register" />
      <SectionShell>
        <AuthWrap>
          <AuthCard>
            <Title>Sign up on our website</Title>
            <Form onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="name">Name</Label>
                <Field id="name" name="name" type="text" required />
              </div>
              <div>
                <Label htmlFor="lastname">Lastname</Label>
                <Field id="lastname" name="lastname" type="text" required />
              </div>
              <div>
                <Label htmlFor="email">Email address</Label>
                <Field id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Field id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <div>
                <Label htmlFor="confirmpassword">Confirm password</Label>
                <Field id="confirmpassword" name="confirmpassword" type="password" autoComplete="current-password" required />
              </div>
              <Terms>
                <input id="remember-me" name="remember-me" type="checkbox" /> Accept our terms and privacy policy
              </Terms>
              <PrimaryButton type="submit">Sign up</PrimaryButton>
              <ErrorText>{error && error}</ErrorText>
            </Form>
          </AuthCard>
        </AuthWrap>
      </SectionShell>
    </div>
  );
};

export default RegisterPage;
