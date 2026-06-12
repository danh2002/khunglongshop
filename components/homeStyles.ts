import { css, keyframes } from "styled-components";

export const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(32px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const revealSection = (delay = 0) => css`
  animation: ${fadeInUp} 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: ${delay}ms;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
