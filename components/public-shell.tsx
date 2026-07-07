import styled, { css } from "styled-components";

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
      url("/images/backgroundshop.png");
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
