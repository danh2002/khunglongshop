"use client";
import type { ReactNode } from "react";
import { SessionProvider, type SessionProviderProps } from "next-auth/react";

type AuthProviderProps = {
  children: ReactNode;
  session?: SessionProviderProps["session"];
};

const AuthProvider = ({ children, session }: AuthProviderProps) => {
  return <SessionProvider session={session}>{children}</SessionProvider>;
};

export default AuthProvider;
