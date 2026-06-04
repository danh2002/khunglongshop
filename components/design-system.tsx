"use client";

import Link from "next/link";
import styled, { css } from "styled-components";
import { LazyMotion, domAnimation, m } from "framer-motion";

export const smoothEase = [0.25, 0.46, 0.45, 0.94] as const;

export const space = {
  xs: "8px",
  sm: "16px",
  md: "24px",
  lg: "32px",
  xl: "48px",
  "2xl": "64px",
  "3xl": "96px",
} as const;

export const motionProps = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.62, ease: smoothEase },
};

export const MotionProvider = ({ children }: { children: React.ReactNode }) => (
  <LazyMotion features={domAnimation}>{children}</LazyMotion>
);

export const MDiv = m.div;

export const sectionPattern = css`
  position: relative;
  background: #070707;
  border-top: 1px solid rgba(255, 106, 0, 0.22);
  isolation: isolate;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -3;
    background-image:
      url("/pexels-format-1029757.jpg");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 0.24;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -2;
    background:
      radial-gradient(circle at 50% 0%, rgba(255, 106, 0, 0.12), transparent 30%),
      linear-gradient(180deg, rgba(7, 7, 7, 0.78), rgba(7, 7, 7, 0.92));
  }
`;

export const SectionShell = styled.section`
  ${sectionPattern}
`;

export const Wrapper = styled.div`
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: clamp(3rem, 6vw, 5rem) clamp(1rem, 3vw, 2rem);
`;

export const Eyebrow = styled.p`
  display: inline-grid;
  grid-template-columns: 72px auto 72px;
  align-items: center;
  gap: 1rem;
  margin: 0;
  font-size: 0.56rem;
  font-weight: 900;
  letter-spacing: 0.24rem;
  text-transform: uppercase;
  color: #e85d00;

  &::before,
  &::after {
    content: "";
    height: 1px;
    background: rgba(255, 106, 0, 0.58);
  }
`;

export const SectionHeading = styled.h2`
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
  font-size: clamp(2.4rem, 5.4vw, 4.6rem);
  font-style: italic;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 0.95;
  text-transform: uppercase;

  span {
    color: #f47912;
  }
`;

export const BodyText = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.96rem;
  line-height: 1.8;
`;

export const Card = styled(MDiv)`
  position: relative;
  overflow: hidden;
  background: rgba(10, 10, 10, 0.92);
  border: 1px solid rgba(255, 106, 0, 0.16);
  box-shadow: 0 20px 46px rgba(0, 0, 0, 0.45);
`;

export const cardHover = {
  whileHover: { y: -6, scale: 1.01 },
  transition: { duration: 0.3, ease: smoothEase },
};

export const ProductImageFrame = styled.div`
  position: relative;
  height: 52%;
  min-height: 230px;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.03);

  &::after {
    content: "";
    position: absolute;
    inset: auto 0 0;
    height: 45%;
    background: linear-gradient(180deg, transparent, rgba(10, 10, 10, 0.96));
    pointer-events: none;
  }
`;

export const CardTitle = styled.h3`
  position: relative;
  margin: 0;
  padding-left: 0.9rem;
  color: rgba(255, 255, 255, 0.88);
  font-size: 1.08rem;
  font-style: italic;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.25;
  text-transform: uppercase;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    width: 3px;
    height: 28px;
    background: #e85d00;
    transform: translateY(-50%);
  }
`;

const buttonBase = css`
  min-height: 74px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  padding: 0 1.5rem;
  border: 0;
  clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%);
  color: #fff;
  cursor: pointer;
  font-family: var(--font-body), sans-serif;
  font-size: clamp(1rem, 2vw, 1.45rem);
  font-style: italic;
  font-weight: 900;
  letter-spacing: 0;
  text-decoration: none;
  text-transform: uppercase;
  transition:
    transform 180ms ease,
    background 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    opacity 180ms ease;

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 4px;
  }

  &:disabled,
  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.48;
    transform: none;
  }
`;

export const PrimaryLink = styled(Link)`
  ${buttonBase}
  background: #e85d00;

  &:hover {
    background: #ff6a00;
    box-shadow: 0 16px 34px rgba(232, 93, 0, 0.24);
  }
`;

export const SecondaryLink = styled(Link)`
  ${buttonBase}
  background: rgba(14, 15, 17, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.28);

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.48);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
  }
`;

export const PrimaryButton = styled.button`
  ${buttonBase}
  width: 100%;
  background: #e85d00;

  &:hover {
    background: #ff6a00;
    box-shadow: 0 16px 34px rgba(232, 93, 0, 0.24);
  }
`;

export const SecondaryButton = styled.button`
  ${buttonBase}
  width: 100%;
  min-height: 58px;
  background: rgba(14, 15, 17, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.28);
  font-size: 0.82rem;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.48);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
  }
`;

export const inputStyles = css`
  width: 100%;
  min-height: 48px;
  padding: 0.8rem 0.95rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 106, 0, 0.22);
  border-radius: 0;
  color: rgba(255, 255, 255, 0.88);

  &:focus {
    border-color: #e85d00;
    outline: none;
    box-shadow: 0 0 0 2px rgba(232, 93, 0, 0.18);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.42);
  }
`;

export const Field = styled.input`
  ${inputStyles}
`;
